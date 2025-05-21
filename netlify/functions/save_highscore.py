import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime

    # Inicializa Firebase Admin SDK si no ha sido inicializado
if not firebase_admin._apps:
        try:
            cred_json = os.environ.get('FIREBASE_CONFIG')
            if cred_json:
                cred = credentials.Certificate(json.loads(cred_json))
                firebase_admin.initialize_app(cred)
            else:
                print("Error: FIREBASE_CONFIG environment variable not set.")
        except Exception as e:
            print(f"Error initializing Firebase: {e}")

db = firestore.client()

def handler(event, context):
        """
        Función de Netlify que recibe y guarda un nuevo récord en Firestore.
        También gestiona el límite de los 100 mejores récords.
        """
        if event['httpMethod'] != 'POST':
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    "status": "error",
                    "message": "Método no permitido. Solo POST."
                })
            }

        try:
            # Parsea el cuerpo de la petición JSON
            body = json.loads(event['body'])
            player_name = body.get('name')
            player_score = body.get('score')

            # Validación básica de los datos
            if not isinstance(player_name, str) or not player_name.strip():
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        "status": "error",
                        "message": "Nombre de jugador inválido."
                    })
                }
            if not isinstance(player_score, (int, float)):
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        "status": "error",
                        "message": "Puntuación inválida."
                    })
                }

            # Limpia el nombre del jugador y asegura un máximo de caracteres
            player_name = player_name.strip()[:20] # Limita el nombre a 20 caracteres

            highscores_ref = db.collection('highscores')

            # 1. Añadir el nuevo récord
            new_record = {
                'name': player_name,
                'score': player_score,
                'timestamp': firestore.SERVER_TIMESTAMP # Firestore añade la fecha del servidor
            }
            highscores_ref.add(new_record)

            # 2. Mantener solo los 100 mejores récords
            # Obtener los récords ordenados por puntuación ascendente (los más bajos)
            # y luego por timestamp ascendente para desempates (los más antiguos primero)
            # Esto es para eliminar los récords más bajos y/o antiguos si hay más de 100
            query = highscores_ref.order_by('score', direction=firestore.Query.ASCENDING).order_by('timestamp', direction=firestore.Query.ASCENDING).limit(101)
            docs = query.stream()

            # Recopilar los documentos a eliminar si exceden el límite de 100
            docs_to_delete = []
            for i, doc in enumerate(docs):
                if i >= 100: # Si hay más de 100 documentos, los restantes son los que hay que eliminar
                    docs_to_delete.append(doc.id)

            # Eliminar los documentos excedentes
            for doc_id in docs_to_delete:
                db.collection('highscores').document(doc_id).delete()


            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    "status": "ok",
                    "message": "Récord guardado y tabla actualizada."
                })
            }

        except Exception as e:
            print(f"Error saving highscore: {e}")
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    "status": "error",
                    "message": str(e)
                })
            }