// netlify/functions/get-highscores/get-highscores.js

const admin = require('firebase-admin');

// Inicializa Firebase Admin SDK si no ha sido inicializado
// Las credenciales se obtendrán de las variables de entorno de Netlify.
// Es crucial que la variable de entorno 'FIREBASE_CONFIG' contenga el JSON
// de tu clave de servicio como una cadena de texto (como ya lo tienes).
if (!admin.apps.length) {
    try {
        const credJson = process.env.FIREBASE_CONFIG;
        if (credJson) {
            const serviceAccount = JSON.parse(credJson);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.error("Error: FIREBASE_CONFIG environment variable not set.");
            // En un entorno de desarrollo local, podrías cargar un archivo de credenciales:
            // const serviceAccount = require("../../path/to/your/serviceAccountKey.json");
            // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
    } catch (e) {
        console.error(`Error initializing Firebase: ${e.message}`);
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    // Asegura que solo se procesen peticiones GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ status: "error", message: "Método no permitido. Solo GET." })
        };
    }

    try {
        const highscoresRef = db.collection('highscores');

        const querySnapshot = await highscoresRef.orderBy('score', 'desc').limit(100).get();

        const highscores = [];
        querySnapshot.forEach(doc => {
            const scoreData = doc.data();
            highscores.push({
                name: scoreData.name || "Anónimo",
                score: scoreData.score || 0
            });
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*" // Habilita CORS
            },
            body: JSON.stringify({
                status: "ok",
                highscores: highscores
            })
        };
    } catch (error) {
        console.error(`Error fetching highscores: ${error.message}`);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                status: "error",
                message: `Error interno del servidor: ${error.message}`
            })
        };
    }
};