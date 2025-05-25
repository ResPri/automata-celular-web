const admin = require('firebase-admin');

if (!admin.apps.length) {
    try {
        // Se asume que FIREBASE_CONFIG es una cadena JSON
        const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

        admin.initializeApp({
            credential: admin.credential.cert(firebaseConfig)
        });
        console.log('Firebase Admin SDK inicializado correctamente.');
    } catch (e) {
        console.error('Error al inicializar Firebase Admin SDK:', e.message);
        throw new Error('Falló la inicialización de Firebase Admin SDK: ' + e.message);
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    // Manejar solicitudes OPTIONS (pre-flight CORS)
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: "OK"
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ status: "error", message: "Método no permitido. Solo POST." })
        };
    }

    try {
        const data = JSON.parse(event.body);
        const { name, score } = data;

        if (!name || typeof score === 'undefined') {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: JSON.stringify({ status: "error", message: "Nombre y puntuación son requeridos." })
            };
        }

        // Guardar la puntuación
        await db.collection('highscores').add({
            name: name,
            score: score,
            timestamp: admin.firestore.FieldValue.serverTimestamp() // Para ordenar por fecha
        });

        // Opcional: Limitar el número de puntuaciones altas si quieres mantener la tabla pequeña
        // Esto es más avanzado y podría hacerse con un Cloud Function independiente
        // o consultando y eliminando las más bajas aquí. Por ahora, lo dejamos simple.

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ status: "ok", message: "Récord guardado y tabla actualizada." })
        };

    } catch (error) {
        console.error('Error al guardar la puntuación alta:', error.message);
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ status: "error", message: "Error interno del servidor: " + error.message })
        };
    }
};