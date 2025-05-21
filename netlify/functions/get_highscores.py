import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

    # Inicializa Firebase Admin SDK si no ha sido inicializado
    # Las credenciales se obtendrán de las variables de entorno de Netlify.
    # Es crucial que la variable de entorno 'FIREBASE_CONFIG' contenga el JSON
    # de tu clave de servicio como una cadena de texto.
if not firebase_admin._apps:
        try:
            cred_json = os.environ.get('FIREBASE_CONFIG')
            if cred_json:
                # Carga las credenciales desde la cadena JSON de la variable de entorno.
                cred = credentials.Certificate(json.loads(cred_json))
                firebase_admin.initialize_app(cred)
            else:
                # Si la variable de entorno no está configurada, imprime un error.
                # Esto es importante para depuración en Netlify.
                print("Error: FIREBASE_CONFIG environment variable not set.")
                # En un entorno de desarrollo local, podrías cargar un archivo de credenciales:
                # cred = credentials.Certificate("path/to/your/serviceAccountKey.json")
                # firebase_admin.initialize_app(cred)
        except Exception as e:
            # Captura cualquier error durante la inicialización de Firebase.
            print(f"Error initializing Firebase: {e}")

    # Obtiene una referencia al cliente de Firestore.
db = firestore.client()

def handler(event, context):
        """
        Función de Netlify que obtiene la tabla de récords de Firestore.
        Esta función será invocada por una petición HTTP (GET).

        Args:
            event (dict): El objeto de evento que contiene información de la petición HTTP.
                          Para una petición GET, 'event' puede contener 'queryStringParameters'.
            context (object): El objeto de contexto de la función (no se usa directamente aquí).

        Returns:
            dict: Un diccionario que representa la respuesta HTTP.
                  Debe incluir 'statusCode', 'headers' y 'body'.
        """
        try:
            # Referencia a la colección 'highscores' en Firestore.
            highscores_ref = db.collection('highscores')

            # Consulta para obtener los 100 mejores récords:
            # - Ordena por 'score' en orden descendente (el más alto primero).
            # - Limita los resultados a 100.
            query = highscores_ref.order_by('score', direction=firestore.Query.DESCENDING).limit(100)
            
            # Obtiene los documentos que coinciden con la consulta.
            docs = query.stream()

            highscores = []
            # Itera sobre cada documento obtenido.
            for doc in docs:
                # Convierte el documento de Firestore a un diccionario de Python.
                score_data = doc.to_dict()
                highscores.append({
                    # Usa .get() para acceder a los campos de forma segura,
                    # proporcionando un valor por defecto si el campo no existe.
                    "name": score_data.get("name", "Anónimo"),
                    "score": score_data.get("score", 0)
                })

            # Prepara la respuesta HTTP exitosa.
            return {
                'statusCode': 200, # Código de estado HTTP 200 (OK).
                'headers': {
                    'Content-Type': 'application/json', # Indica que la respuesta es JSON.
                    'Access-Control-Allow-Origin': '*' # Habilita CORS para permitir peticiones desde cualquier origen.
                                                      # Esto es crucial para que tu juego web pueda llamar a la función.
                },
                'body': json.dumps({ # Convierte el diccionario de respuesta a una cadena JSON.
                    "status": "ok",
                    "highscores": highscores
                })
            }
        except Exception as e:
            # Captura cualquier excepción que ocurra durante la ejecución de la función.
            print(f"Error fetching highscores: {e}") # Imprime el error para depuración en los logs de Netlify.
            # Prepara una respuesta HTTP de error.
            return {
                'statusCode': 500, # Código de estado HTTP 500 (Internal Server Error).
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    "status": "error",
                    "message": str(e) # Incluye el mensaje de error en la respuesta.
                })
            }