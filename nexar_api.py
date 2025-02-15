"""Example request for extracting GraphQL part data."""
import sys
import os

"""Resources for making Nexar requests."""
import requests
import base64
import json
import time
from typing import Dict

NEXAR_URL = "https://api.nexar.com/graphql"
PROD_TOKEN_URL = "https://identity.nexar.com/connect/token"

def get_token(client_id, client_secret):
    """Return the Nexar token from the client_id and client_secret provided."""

    if not client_id or not client_secret:
        raise Exception("client_id and/or client_secret are empty")

    token = {}
    try:
        token = requests.post(
            url=PROD_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret
            },
            allow_redirects=False,
        ).json()

    except Exception:
        raise

    return token
def decodeJWT(token):
    return json.loads(
        (base64.urlsafe_b64decode(token.split(".")[1] + "==")).decode("utf-8")
    )

class NexarClient:
    def __init__(self, id, secret) -> None:
        self.id = id
        self.secret = secret
        self.s = requests.session()
        self.s.keep_alive = False

        self.token = get_token(id, secret)
        self.s.headers.update({"token": self.token.get('access_token')})
        self.exp = decodeJWT(self.token.get('access_token')).get('exp')

    def check_exp(self):
        if (self.exp < time.time() + 300):
            self.token = get_token(self.id, self.secret)
            self.s.headers.update({"token": self.token.get('access_token')})
            self.exp = decodeJWT(self.token.get('access_token')).get('exp')

    def get_query(self, query: str, variables: Dict) -> dict:
        """Return Nexar response for the query."""
        try:
            self.check_exp()
            r = self.s.post(
                NEXAR_URL,
                json={"query": query, "variables": variables},
            )

        except Exception as e:
            print(e)
            raise Exception("Error while getting Nexar response")

        response = r.json()
        if ("errors" in response):
            for error in response["errors"]: print(error["message"])
            raise SystemExit

        return response["data"]
    
# QUERY_MPN = """
# query ($mpn: String!) {
#   supSearchMpn(q: $mpn) {
#     results {
#       part {
#         category {
#           parentId
#           id
#           name
#           path
#         }
#         mpn
#         manufacturer {
#           name
#         }
#         shortDescription
#         descriptions {
#           text
#           creditString
#         }
#         specs {
#           attribute {
#             name
#             shortname
#           }
#           displayValue
#         }
#       }
#     }
#   }
# }
# """

def SearchMPN(que):        
    gqlQuery = '''
    query SearchMPN($que: String!) {  
      supSearch(
        q: $que        
        start: 0
        limit: 1 
        ){   
            results  {      	
                part  {
                    mpn
                    genericMpn
                    akaMpns
                    manufacturer {name}
                    shortDescription
                    sellers (authorizedOnly: true) {   
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
    '''    
    data = nexar.get_query(gqlQuery, {"que": que})
    print(json.dumps(data, indent=2))
    return data

if __name__ == '__main__':

    # client_id = os.environ["NEXAR_CLIENT_ID"]
    # client_secret = os.environ["NEXAR_CLIENT_SECRET"]
    client_id = "cf70abbf-2f68-4b5e-abde-fd782a74e0cb"
    client_secret = "ZeY4Xd8HN3FtSeTN-GvUi6PgQLzuEdHl72sx"
    nexar = NexarClient(client_id, client_secret)

    # mpn = input("Enter a MPN: ")
    # if not mpn:
    #     sys.exit()

    # variables = {
    #     "mpn": mpn
    # }
    # data = nexar.get_query(QUERY_MPN, variables)
    # print(json.dumps(data["supSearchMpn"], indent=1))

    part = "AD7685ARM"
    SearchMPN(part)
    # parts = [["Davis 6410 Anemometer", "Adafruit 1733 Wind Vane", "ESP32-WROOM-32", "Bud Industries NBF-32016 Weatherproof Enclosure", "TalentCell Rechargeable 12V/5V Battery", "Renogy 10W Solar Panel", "Heltec LoRa ESP32 V3", "Raspberry Pi 4 Model B (4GB)", "CanaKit 5V 3.5A Power Adapter", "BSS138-based Level Converter", "Mosquitto MQTT", "MG996R Servo Motor", "Adafruit PCA9685 16-Channel PWM Driver", "MeanWell LRS-150-5 Power Supply", "MG996R Servo Bracket Kit", "Lightweight Silk Leaves", "40pcs Male-Female Dupont Wire"]]
    # parts = ["ESP32-WROOM-32", "Adafruit PCA9685 16-Channel PWM Driver"]
    # for part in parts:
    #   SearchMPN(part)
