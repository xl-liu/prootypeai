import { useEffect, useState, useRef } from "react";
import Button from "./Button";
import mermaid from "mermaid";

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_questions_on_screen",
        description:
          "You must call this function before asking the user clarifying questions. This allows the user to see them on screen and acts as a visual aid to help them stay oriented. You should still ask them the questions as audio, but call this first",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            type: {
              type: "string",
              enum: ["display_questions_on_screen"],
              description: "Type of questions to ask",
            },
            questions: {
              type: "array",
              description: "List of questions to ask",
              items: {
                type: "string",
                description: "Summary of the question to ask, just a few words",
              },
            },
          },
          required: ["type", "questions"],
        },
      },
      {
        type: "function",
        name: "show_circuit_diagram",
        description:
          "Call this function to display a circuit diagram using TikZ notation",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            tikz: {
              type: "string",
              description:
                "TikZ code for rendering the circuit diagram, will be wrapped in documentclass and \\begin{document}\n\nFor example:\n\\begin{circuitikz}[american voltages]\n\\draw\n  (0,0) to [short, *-] (6,0)\n  to [V, l_=$\\mathrm{j}{\\omega}_m \\underline{\\psi}^s_R$] (6,2) \n  to [R, l_=$R_R$] (6,4) \n  to [short, i_=$\\underline{i}^s_R$] (5,4) \n  (0,0) to [open, v^>=$\\underline{u}^s_s$] (0,4) \n  to [short, *- ,i=$\\underline{i}^s_s$] (1,4) \n  to [R, l=$R_s$] (3,4)\n  to [L, l=$L_{\\sigma}$] (5,4) \n  to [short, i_=$\\underline{i}^s_M$] (5,3) \n  to [L, l_=$L_M$] (5,0); \n\\end{circuitikz}\n",
            },
          },
          required: ["type", "tikz"],
        },
      },
      {
        type: "function",
        name: "show_functional_diagram",
        description:
          "Call this function to display a functional block diagram using Mermaid notation",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            mermaid: {
              type: "string",
              description: "Mermaid code for rendering the functional diagram",
            },
          },
          required: ["type", "tikz"],
        },
      },
      {
        type: "function",
        name: "show_bom_list",
        description: "Call this function to display a bill of materials list",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            parts: {
              type: "array",
              description: "List of parts in the BOM",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Name of the part",
                  },
                  quantity: {
                    type: "number",
                    description: "Quantity needed",
                  },
                  description: {
                    type: "string",
                    description: "Description of the part",
                  },
                },
                required: ["name", "quantity", "description"],
              },
            },
          },
          required: ["type", "parts"],
        },
      },
      {
        type: "function",
        name: "show_emoji",
        description: "Call this function to display a large emoji on screen",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            emoji: {
              type: "string",
              description: "The emoji character to display",
            },
          },
          required: ["type", "emoji"],
        },
      },
      {
        type: "function",
        name: "search_parts",
        description: `Call this function to search for electronic parts information such as pricing and manufacturer,
          , given the part name or MPN (Manufacturer Part Number)`,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            type: {
              type: "string",
              enum: ["parts_search"],
              description: "Type of search to perform",
            },
            parts: {
              type: "array",
              description: "List of parts to search for",
              items: {
                type: "string",
                description: "Part name or MPN (Manufacturer Part Number)",
              },
            },
          },
          required: ["type", "parts"],
        },
      },
    ],
    tool_choice: "auto",
    instructions: `
You are a helpful assistant that can help with hardware design and planning. You always answer in a serious and professional tone that is appropriate for a high-level meeting, while keeping your responses concise and to the point, one or two sentences max before asking the user for more information.

Generally, the conversation will proceed as follows:
0. User will describe their project to you.
1. Then you need to call the "display_questions_on_screen" function to display a couple of clarifying questions on screen to help guide the conversation.
2. Create a block digaram of the whole project to get user's feedback.
3. Iterate with the user to refine the block diagram until they're happy with it.
4. Work with the user to define the circuit diagram for each functional block in the block diagram to ensure functionality. 
(if you ever find yourself talking about something that doesn't have a visual representation, call the "show_emoji" function to express your current thinking)
5. Once the user is happy with the circuit diagrams, create a bill of materials for the project.
6. Display a congratulatory emoji to the user to show that you're done.

You can create circuit diagrams, functional diagrams, or bill of materials.
    `,
  },
};

function TikZDiagram({ tikz }) {
  const [imageData, setImageData] = useState(null);
  const [pdfData, setPdfData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRenderedTikz, setLastRenderedTikz] = useState(null);

  useEffect(() => {
    const fetchDiagram = async () => {
      try {
        console.log("rendering tikz", tikz);
        setIsLoading(true);
        const response = await fetch(`/render`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: tikz }),
        });
        if (!response.ok) {
          console.error("Failed to render diagram", response);
          throw new Error("Failed to render diagram");
        }
        const data = await response.json();
        const { image, pdf } = data;
        setImageData(image);
        setPdfData(pdf);
        setLastRenderedTikz(tikz);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if tikz has changed from last rendered version
    if (!isLoading && tikz !== lastRenderedTikz) {
      fetchDiagram();
    }
  }, [tikz, lastRenderedTikz]);

  if (isLoading) return <div>Rendering diagram...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="flex flex-col gap-2">
      <img
        src={`data:image/png;base64,${imageData}`}
        alt="Circuit diagram"
        className="max-w-full h-auto object-contain"
      />
    </div>
  );
}

function TikZDiagram2({ tikz }) {
  // return <script type="text/tikz">{tikz}</script>;

  tikz =
    "\\documentclass{article}\n\\usepackage{circuitikz}\n\\begin{document}\n\\begin{center}\n\\begin{circuitikz}[american voltages]\n\\draw\n  (0,0) to [short, *-] (6,0)\n  to [V, l_=$\\mathrm{j}{\\omega}_m \\underline{\\psi}^s_R$] (6,2) \n  to [R, l_=$R_R$] (6,4) \n  to [short, i_=$\\underline{i}^s_R$] (5,4) \n  (0,0) to [open, v^>=$\\underline{u}^s_s$] (0,4) \n  to [short, *- ,i=$\\underline{i}^s_s$] (1,4) \n  to [R, l=$R_s$] (3,4)\n  to [L, l=$L_{\\sigma}$] (5,4) \n  to [short, i_=$\\underline{i}^s_M$] (5,3) \n  to [L, l_=$L_M$] (5,0); \n\\end{circuitikz}\n\\end{center}\n\\end{document}\n";
  return <script type="text/tikz">{tikz}</script>;
}

function QuestionsDisplay({ questions }) {
  return (
    <div className="flex flex-col gap-6">
      <ul className="space-y-8">
        {questions.map((question, i) => (
          <li
            key={i}
            className="text-l leading-relaxed text-gray-700 pl-8 relative before:content-['•'] before:absolute before:left-0 before:text-blue-500 before:font-bold before:text-4xl before:-top-1"
          >
            {question}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Initialize mermaid. We disable startOnLoad since we'll trigger rendering manually.
mermaid.initialize({ startOnLoad: false });

function MermaidChart({ chart, id }) {
  const [loading, setLoading] = useState(false);
  const [svg, setSvg] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  // Track mounting
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Handle rendering once mounted
  useEffect(() => {
    const render = async () => {
      if (!isMounted) return;
      setLoading(true);

      try {
        console.log("attempting to render mermaid", id, chart);
        const type = mermaid.detectType(chart);
        console.log("mermaid type", type);
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) {
          // Check if still mounted before updating state
          setSvg(svg);
        }
      } catch (error) {
        console.error("Failed to render mermaid:", error);
      } finally {
        if (isMounted) {
          // Check if still mounted before updating state
          setLoading(false);
        }
      }
    };

    // Always re-render when chart changes
    render();
  }, [chart, id, isMounted]); // Removed loading and svg from dependencies

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg || "" }}
      className="relative flex items-center justify-center w-full h-full [&_svg]:w-auto [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:max-h-full overflow-y-scroll"
    />
  );
}

function EmojiDisplay({ emoji }) {
  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      <div className="text-[200px]">{emoji}</div>
    </div>
  );
}

const SEARCH_MPN = `
  query SearchMPN($que: String!) {  
    supSearch(
      q: $que        
      start: 0
      limit: 1 
    ){   
      results {      	
        part {
          mpn
          genericMpn
          manufacturer {name}
          shortDescription
          sellers(authorizedOnly: true) {   
            company {name}
            offers { 
              packaging
              factoryPackQuantity
              multipackQuantity
              inventoryLevel
              moq
              orderMultiple                                                   
              prices {                
                quantity
                price        
              }                            
              clickUrl    
            }			
          }
        }
      }    
    }
  }
`;

async function getQuery(query=SEARCH_MPN, variables) {
  const [token, setToken] = useState(null);

  useEffect(() => {
    fetch('/api/token')
      .then(res => res.json())
      .then(data => setToken(data.token))
      .catch(console.error);
  }, []);

  try {
      // Assuming checkExp() and token management are handled elsewhere
      const response = await fetch(NEXAR_URL, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'token': token.access_token
          },
          body: JSON.stringify({
              query: query,
              variables: variables
          })
      });

      const data = await response.json();
      
      if ('errors' in data) {
          data.errors.forEach(error => console.error(error.message));
          throw new Error('GraphQL query failed');
      }

      return data.data;
  } catch (error) {
      console.error(error);
      throw new Error('Error while getting Nexar response');
  }
}

function parsePartInfo(data) {
    if (!data?.supSearch?.results?.[0]?.part) {
        throw new Error('No part data found');
    }

    const part = data.supSearch.results[0].part;
    const seller = part.sellers?.[0];
    const offer = seller?.offers?.[0];
    
    return {
        name: part.mpn || '',
        quantity: 1,
        description: `${part.manufacturer?.name || ''} - ${part.shortDescription || ''}`,
        cost_per_unit: offer?.prices?.[0]?.price || 0,
        link: offer?.clickUrl || ''
    };
}

// Export a function that matches the ToolPanel interface
async function searchParts(params) {
    if (params.type !== 'parts_search' || !params.parts || !params.parts.length) {
        throw new Error('Invalid search parameters');
    }

    // Search for each part and collect results
    const results = [];
    for (const partName of params.parts) {
        try {
            const result = await getQuery(SEARCH_MPN, TOKEN, {
                que: partName
            });
            const partInfo = parsePartInfo(result);
            results.push(partInfo);
        } catch (error) {
            console.error(`Failed to search for part ${partName}:`, error);
            // Add a placeholder for failed searches
            results.push({
                name: partName,
                quantity: 1,
                description: 'Part not found',
                cost: 0,
                link: ''
            });
        }
    }
    return results;
}

function FunctionCallOutput({ functionCallOutput }) {
  const fargs =
    typeof functionCallOutput.arguments === "string"
      ? JSON.parse(functionCallOutput.arguments)
      : functionCallOutput.arguments;
  const name = functionCallOutput.name;
  const { type, ...data } = fargs;

  const raw = <></>;

  if (name === "show_circuit_diagram") {
    const { tikz } = data;
    return (
      <div className="flex flex-col gap-2">
        <div className="border rounded-md p-4">
          <TikZDiagram tikz={tikz} />
        </div>
        {/* {raw} */}
      </div>
    );
  }

  if (name === "show_functional_diagram") {
    const { mermaid } = data;
    return (
      <div className="flex flex-col gap-2">
        <h3 className="font-bold" role="heading" aria-level="3">
          Functional Diagram
        </h3>
        <div className="border rounded-md p-4">
          <MermaidChart chart={mermaid} id="singleton-mermaid-chart" />
        </div>
        {raw}
      </div>
    );
  }

  if (name === "display_questions_on_screen") {
    const { questions } = data;
    return <QuestionsDisplay questions={questions} />;
  }

  if (name === "show_emoji") {
    const { emoji } = data;
    return <EmojiDisplay emoji={emoji} />;
  }

  if (name === "show_bom_list") {
    const { parts } = data;
    return (
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Bill of Materials</h3>
        <div className="border rounded-md p-4">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Part</th>
                <th className="text-left">Quantity</th>
                <th className="text-left">Cost</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part, i) => (
                <tr key={i}>
                  <td>{part.name}</td>
                  <td>{part.quantity}</td>
                  <td>${part.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-red-500">Unknown function call type: {type}</p>
      {raw}
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState();

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          (output.name === "show_circuit_diagram" ||
            output.name === "show_functional_diagram" ||
            output.name === "display_questions_on_screen" ||
            output.name === "show_bom_list" ||
            output.name === "show_emoji" ||
            output.name === "search_parts")
        ) {
          if (output.type === "function_call") {
            if (output.name === "search_parts") {
              (async () => {
                const results = await searchParts(JSON.parse(output.arguments));
                // console.log('Search results:', results);
              })();
            } else {
              setFunctionCallOutput(output);
            }
          }
          // Make sure model responds when clarifying questions are displayed
          if (output.name === "display_questions_on_screen") {
            setTimeout(() => {
              sendClientEvent({
                type: "response.create",
                response: {
                  instructions: `
                "Start walking the user through the questions you just displayed. If they want to skip a question, you can skip it. If you realize you need more information, ask follow up questions. If the questions diverge significantly from the original questions update the displayed question to match the new context.
              `,
                },
              });
            }, 150);
          }
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      console.log("resetting function call output");
      setFunctionAdded(false);
      // setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  const about = (
    <div className="flex flex-col gap-2 text-xl">
      <h2 className="text-2xl font-bold">Hi! I'm Pai!</h2>
      <p className="text-sm text-gray-400">
        I can create circuit diagrams, functional diagrams, or bill of
        materials. <br />
        Just ask:
      </p>
      <div className="flex flex-col gap-2 max-w-md flex-wrap text-sm">
        <li className="inline-block rounded-lg bg-blue-100 border-2 border-blue-700 px-4 py-2 break-words">
          LED mood lamp with adjustable colors
        </li>
        <li className="inline-block rounded-lg bg-green-100 border-2 border-green-700 px-4 py-2 break-words">
          Arduino-based temperature monitor
        </li>
        <li className="inline-block rounded-lg bg-purple-100 border-2 border-purple-700 px-4 py-2 break-words">
          Simple FM radio receiver
        </li>
        <li className="inline-block rounded-lg bg-orange-100 border-2 border-orange-700 px-4 py-2 break-words">
          USB power bank with voltage regulation
        </li>
      </div>
    </div>
  );

  // Add debug controls when in development
  const debugControls = process.env.NODE_ENV === "development" && (
    <div className="debug-controls mt-4 flex flex-wrap gap-2">
      <Button
        onClick={() => {
          setFunctionCallOutput({
            type: "function_call",
            name: "display_questions_on_screen",
            arguments: JSON.stringify({
              type: "display_questions_on_screen",
              questions: [
                "What color options would you like for the mood lamp?",
                "Do you need any specific brightness levels?",
                "What power source will you be using?",
              ],
            }),
          });
        }}
      >
        Debug Questions
      </Button>

      <Button
        onClick={() => {
          setFunctionCallOutput({
            type: "function_call",
            name: "show_circuit_diagram",
            arguments: JSON.stringify({
              type: "circuit_diagram",
              tikz: "\\begin{center}\n\\begin{circuitikz}[american voltages]\n\\draw\n  (0,0) to [short, *-] (6,0)\n  to [V, l_=$\\mathrm{j}{\\omega}_m \\underline{\\psi}^s_R$] (6,2) \n  to [R, l_=$R_R$] (6,4) \n  to [short, i_=$\\underline{i}^s_R$] (5,4) \n  (0,0) to [open, v^>=$\\underline{u}^s_s$] (0,4) \n  to [short, *- ,i=$\\underline{i}^s_s$] (1,4) \n  to [R, l=$R_s$] (3,4)\n  to [L, l=$L_{\\sigma}$] (5,4) \n  to [short, i_=$\\underline{i}^s_M$] (5,3) \n  to [L, l_=$L_M$] (5,0); \n\\end{circuitikz}\n\\end{center}",
            }),
          });
        }}
      >
        Debug Circuit
      </Button>

      <Button
        onClick={() =>
          setFunctionCallOutput({
            type: "function_call",
            name: "show_functional_diagram",
            arguments: JSON.stringify({
              type: "functional_diagram",
              mermaid: `graph TD
              A[Power Supply] --> B[Microcontroller]
              B --> C[LED Driver]
              C --> D[RGB LEDs]
              B --> E[User Interface]`,
            }),
          })
        }
      >
        Debug Functional
      </Button>

      <Button
        onClick={() =>
          setFunctionCallOutput({
            type: "function_call",
            name: "show_bom_list",
            arguments: JSON.stringify({
              type: "bom_list",
              parts: [
                {
                  name: "Arduino Nano",
                  quantity: 1,
                  description: "Microcontroller board",
                  cost: 4.99,
                },
                {
                  name: "RGB LED Strip",
                  quantity: 1,
                  description: "WS2812B 1m 60 LED",
                  cost: 12.99,
                },
                {
                  name: "Power Supply",
                  quantity: 1,
                  description: "5V 2A DC Adapter",
                  cost: 7.99,
                },
              ],
            }),
          })
        }
      >
        Debug BOM
      </Button>
    </div>
  );

  return (
    <section
      id="tool-panel"
      className="h-[calc(100vh-10rem)] w-full flex flex-col gap-4 bg-gray-50 rounded-md p-4"
    >
      {functionCallOutput ? (
        <FunctionCallOutput functionCallOutput={functionCallOutput} />
      ) : (
        about
      )}
      {debugControls}
    </section>
  );
}
