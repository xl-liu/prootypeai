import { useEffect, useState } from "react";

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
            type: {
              type: "string",
              enum: ["circuit_diagram"],
              description: "Type of diagram to display",
            },
            tikz: {
              type: "string",
              description: "TikZ code for rendering the circuit diagram",
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
            type: {
              type: "string",
              enum: ["functional_diagram"],
              description: "Type of diagram to display",
            },
            mermaid: {
              type: "string",
              description: "Mermaid code for rendering the functional diagram",
            },
          },
          required: ["type", "mermaid"],
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
            type: {
              type: "string",
              enum: ["bom_list"],
              description: "Type of list to display",
            },
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
5. Once the user is happy with the circuit diagrams, create a bill of materials for the project.

You can create circuit diagrams, functional diagrams, or bill of materials.
    `,
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { type, ...data } = JSON.parse(functionCallOutput.arguments);

  if (type === "circuit_diagram") {
    const { tikz } = data;
    return (
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Circuit Diagram</h3>
        <div className="border rounded-md p-4">
          <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
            {tikz}
          </pre>
        </div>
        <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
          {JSON.stringify(functionCallOutput, null, 2)}
        </pre>
      </div>
    );
  }

  if (type === "functional_diagram") {
    const { mermaid } = data;
    return (
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Functional Diagram</h3>
        <div className="border rounded-md p-4">
          <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
            {mermaid}
          </pre>
        </div>
        <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
          {JSON.stringify(functionCallOutput, null, 2)}
        </pre>
      </div>
    );
  }

  if (type === "display_questions_on_screen") {
    const { questions } = data;
    return (
      <div className="flex flex-col gap-2">
        <h3 className="font-bold">Clarifying Questions</h3>
        <ul className="list-disc list-inside">
          {questions.map((question, i) => (
            <li key={i}>{question}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (type === "bom_list") {
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
        <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
          {JSON.stringify(functionCallOutput, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-red-500">Unknown function call type: {type}</p>
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

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
            output.name === "show_bom_list")
        ) {
          setFunctionCallOutput(output);
          // setTimeout(() => {
          //   sendClientEvent({
          //     type: "response.create",
          //     response: {
          //       instructions: `
          //       ask for feedback about the color palette - don't repeat
          //       the colors, just ask if they like the colors.
          //     `,
          //     },
          //   });
          // }, 500);
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full w-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Hi! I'm Pai!</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <div className="flex flex-col gap-2">
              <p>Ask about creating your hardware project...</p>
              <p>
                I can create circuit diagrams, functional diagrams, or bill of
                materials.
              </p>
              <ul className="list-disc list-inside">
                <li>LED mood lamp with adjustable colors</li>
                <li>Arduino-based temperature monitor</li>
                <li>Simple FM radio receiver</li>
                <li>USB power bank with voltage regulation</li>
              </ul>
            </div>
          )
        ) : (
          <div>
            <p>
              I can help you plan your hardware project by creating circuit
              diagrams, functional diagrams, or bill of materials.
            </p>
            <ul className="list-disc list-inside">
              <li>LED mood lamp with adjustable colors</li>
              <li>Arduino-based temperature monitor</li>
              <li>Simple FM radio receiver</li>
              <li>USB power bank with voltage regulation</li>
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
