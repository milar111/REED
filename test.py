import time
import datetime

token = {
    "access_token": "BQCun9fHhpGVaX7wJLX6qkfP5iZFwMdb0pqkXrSvic_8wkgubareVlcYYeLQ2DjiCWxkj25Z3aIEOhTjf2gukN1nBgY32XNkj_Md3SPBJVJzPtrSblaKkKtrZ-K1wtsGtxl0X27tR2uz87aqTbOzvcMk1_pRL4PlWJni-hKJveMTtUtpF395iWVuP0ZzPagTCHmhBXLYV-0dQcDmH4nB8iXphe8CdOnrjzGrO4K5jPopK7omfg0",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "AQDpmbIgEv880i98QlzKia49H-DQubv9Rlg0Dr55_gFE0onzb56umVoON5AkLZPtTICDh9ny_XJPrTXq7wryIROoQ_F5L2B1jMvN3tByyr6HLNPR1y7LV2Gq3J5doIle7zc",
    "scope": "user-library-read",
    "expires_at": 1739446579
}

# current time 
current_time = int(time.time())

# calc remaining seconds
remaining_seconds = token["expires_at"] - current_time

if remaining_seconds > 0:
    minutes, seconds = divmod(remaining_seconds, 60)
    print(f"Time left: {minutes} minutes and {seconds} seconds")
else:
    print("Token expired")

expiry_datetime = datetime.datetime.fromtimestamp(token["expires_at"])
print("Token expires at:", expiry_datetime)
