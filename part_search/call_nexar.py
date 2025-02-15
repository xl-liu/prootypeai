"""Example request for extracting GraphQL part data."""
import sys
import os

"""Resources for making Nexar requests."""
import requests
import base64
import json
import time
from typing import Dict
from dataclasses import dataclass

@dataclass
class Part_info:
    name: str = None
    mpn: str = None
    genericMpn: str = None
    manufacturer: str = None
    shortDescription: str = None
    seller: str = None
    price: float = None
    link: str = None

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

def SearchParts(ques):
    results = []
    for q in ques:
        data = SearchMPN(q)
        parsed_data = parse_nexar_data(data)
        parsed_data.name = q
        results.append(parsed_data)

    return results

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
    # print(json.dumps(data, indent=2))
    return data

def parse_nexar_data(data, preferred_seller="DigiKey"):
    data = data['supSearch']['results'][0]['part']  # use the first result
    part_info = Part_info()

    seller = None
    for s in data['sellers']:
        if preferred_seller in s['company']['name']:
            seller = s
    if not seller:
        seller = data['sellers'][0]

    part_info.seller = seller['company']['name']
    part_info.price = seller['offers'][0]['prices'][0]['price']
    part_info.link = seller['offers'][0]['clickUrl']
    part_info.mpn = data['mpn']
    part_info.manufacturer = data['manufacturer']['name']
    part_info.shortDescription = data['shortDescription']
    
    return part_info

    
if __name__ == '__main__':

    client_id = os.environ["NEXAR_CLIENT_ID"]
    client_secret = os.environ["NEXAR_CLIENT_SECRET"]
    nexar = NexarClient(client_id, client_secret)
    parts = ["ESP32-WROOM-32", "Adafruit PCA9685 16-Channel PWM Driver"]
    a = SearchParts(parts)
    print(a)
