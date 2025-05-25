// netlify/functions/save-highscore/save-highscore.js

const admin = require('firebase-admin');

// Inicializa Firebase Admin SDK si no ha sido inicializado
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
        }
    } catch (e) {
        console.error(`Error initializing Firebase: ${e.message}`);
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    // Asegura que solo se procesen peticiones POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ status: "error", message: "Método no permitido. Solo POST." })
        };
    }

    try {
        const body = JSON.parse(event.body);
        let playerName = body.name;
        let playerScore = body.score;

        // Validación de datos
        if (typeof playerName !== 'string' || !playerName.trim()) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ status: "error", message: "Nombre de jugador inválido." })
            };
        }
        if (typeof playerScore !== 'number' || isNaN(playerScore)) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ status: "error", message: "Puntuación inválida." })
            };
        }

        playerName = playerName.trim().substring(0, 20); // Limita el nombre a 20 caracteres

        const highscoresRef = db.collection('highscores');

        // 1. Añadir el nuevo récord
        const newRecord = {
            name: playerName,
            score: playerScore,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        await highscoresRef.add(newRecord);

        // 2. Mantener solo los 100 mejores récords
        const querySnapshot = await highscoresRef.orderBy('score', 'asc')
                                            .orderBy('timestamp', 'asc')
                                            .limit(101) // Obtenemos 101 para ver si hay que eliminar
                                            .get();

        const docsToDelete = [];
        let count = 0;
        querySnapshot.forEach(doc => {
            if (count >= 100) {
                docsToDelete.push(doc.id);
            }
            count++;
        });

        // Eliminar los documentos excedentes
        const batch = db.batch();
        docsToDelete.forEach(docId => {
            batch.delete(db.collection('highscores').doc(docId));
        });
        await batch.commit();


        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
                status: "ok",
                message: "Récord guardado y tabla actualizada."
            })
        };
    } catch (error) {
        console.error(`Error saving highscore: ${error.message}`);
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