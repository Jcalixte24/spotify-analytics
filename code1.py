import pandas as pd
import requests
import base64
import time
import math

# --- CONFIGURATION ---
CLIENT_ID = '511c7c4a941a444faf7aadf9abc5e16e'
CLIENT_SECRET = '77d6b98171604dd287831c97fa6f455b'
INPUT_FILE = 'dataset.csv' 

# --- 1. CONNEXION API  ---
def get_token():
    url = "https://accounts.spotify.com/api/token"
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_base64 = base64.b64encode(auth_string.encode()).decode()
    
    headers = {"Authorization": "Basic " + auth_base64}
    data = {"grant_type": "client_credentials"}
    
    try:
        req = requests.post(url, headers=headers, data=data, timeout=5)
        return req.json().get("access_token")
    except:
        return None

# --- 2. FONCTION BATCH (Récupère 50 dates d'un coup) ---
def get_dates_batch(track_ids, token):
    # L'API prend les IDs séparés par des virgules
    ids_string = ",".join(track_ids)
    url = f"https://api.spotify.com/v1/tracks?ids={ids_string}"
    headers = {"Authorization": "Bearer " + token}
    
    dates_map = {}
    
    try:
        req = requests.get(url, headers=headers, timeout=10)
        if req.status_code == 200:
            tracks = req.json().get('tracks', [])
            for t in tracks:
                if t and 'album' in t:
                    # On stocke ID -> Date
                    # La date peut être "2021-10-23" ou juste "2021"
                    full_date = t['album']['release_date']
                    year = full_date[:4] # On garde juste l'année
                    dates_map[t['id']] = year
    except Exception as e:
        print(f"Erreur Batch : {e}")
    
    return dates_map

# --- 3. ETL PRINCIPAL ---
print("Chargement du dataset...")
df = pd.read_csv(INPUT_FILE)

df_hits = df[df['popularity'] >= 30].copy()
# On enlève les doublons d'ID
df_hits = df_hits.drop_duplicates(subset=['track_id'])

print(f"Nombre de chansons à enrichir : {len(df_hits)}")

# Récupération du Token
token = get_token()
if not token:
    print("❌ Pas de token (Réseau ou Clés).")
    exit()

# Préparation des batches
track_ids = df_hits['track_id'].tolist()
batch_size = 50
total_batches = math.ceil(len(track_ids) / batch_size)
dates_dict = {}

print("Démarrage de l'enrichissement...")

for i in range(total_batches):
    # On découpe une tranche de 50 IDs
    batch_ids = track_ids[i*batch_size : (i+1)*batch_size]
    
    # Appel API
    new_dates = get_dates_batch(batch_ids, token)
    dates_dict.update(new_dates)
    
    # Barre de progression simple
    if i % 10 == 0:
        print(f" Batch {i}/{total_batches} traité...")
    
    # Pause anti-ban (très courte car on fait peu de requêtes)
    time.sleep(0.5)

print(" Récupération terminée. Fusion des données...")

# --- 4. MERGE ET SAUVEGARDE ---
# On crée une colonne 'year' en mappant l'ID avec notre dictionnaire
df_hits['year'] = df_hits['track_id'].map(dates_dict)

# On nettoie ceux qu'on n'a pas trouvés
df_final = df_hits.dropna(subset=['year'])

# Sélection des colonnes finales
cols_to_keep = ['track_name', 'artists', 'year', 'popularity', 'danceability', 'energy', 'tempo', 'track_genre']
df_final = df_final[cols_to_keep]

# Export JSON
df_final.to_json('dataset_final.json', orient='records', indent=4)
print(" TERMINÉ ! Fichier 'dataset_final.json' généré avec les années.")