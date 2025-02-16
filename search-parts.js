const PROD_TOKEN_URL = "https://identity.nexar.com/connect/token";
const clientId = process.env.NEXAR_CLIENT_ID;
const clientSecret = process.env.NEXAR_CLIENT_SECRET;
const NEXAR_URL = "https://api.nexar.com/graphql"

async function getToken(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
      throw new Error("clientId and/or clientSecret are empty");
  }

  try {
      const response = await fetch(PROD_TOKEN_URL, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: clientSecret
          }),
          redirect: 'manual'
      });

      const token = await response.json();
      return token;
  } catch (error) {
      throw error;
  }
}

const TOKEN = await getToken(clientId, clientSecret);

console.log(TOKEN);

import TOKEN from './server.js'; 
console.log(TOKEN);

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

async function getQuery(query=SEARCH_MPN, token=TOKEN, variables) {
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

// Modify parsePartInfo to handle multiple parts
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
export async function searchParts(params) {
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

// Update the test function to use the parser
async function testSearch() {
    const parts = ["LM358", "ATmega328", "NE555", "7805"]; // Example list of parts to search
    const results = [];
    try {
        for (const part of parts) {
            const result = await getQuery(SEARCH_MPN, TOKEN, {
                que: part
            });
            const partInfo = parsePartInfo(result);
            console.log(`Parsed Part Info for ${part}:`, partInfo);
            results.push(partInfo);
        }
        // // Write all results to a single JSON file
        // const fs = await import('fs');
        // const filePath = './search-results.json';
        // await fs.promises.writeFile(
        //     filePath,
        //     JSON.stringify(results, null, 2),
        //     'utf8'
        // );
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Run the test
testSearch();
