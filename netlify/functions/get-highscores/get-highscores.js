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
        // Si hay un error, lanzamos una excepción para que el fallo sea visible en los logs de Netlify
        throw new Error('Falló la inicialización de Firebase Admin SDK: ' + e.message);
    }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
    try {
        const highscoresRef = db.collection('highscores');
        const snapshot = await highscoresRef.orderBy('score', 'desc').limit(10).get();

        const highscores = [];
        snapshot.forEach(doc => {
            highscores.push(doc.data());
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", // Esto es importante para CORS en desarrollo
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            body: JSON.stringify({ status: "ok", highscores: highscores })
        };
    } catch (error) {
        console.error('Error al obtener las puntuaciones altas:', error.message);
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