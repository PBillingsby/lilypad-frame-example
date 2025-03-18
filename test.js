import http from 'http';
import fs from 'fs';

const PORT = 8080;

var dataCache = {}; 

function handleRequest(req, res) {
    let filePath = "./data/" + req.url;
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end("Error loading file.");
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
}

function startServer() {
    http.createServer(handleRequest).listen(PORT);
    console.log("Server running on port " + PORT);
}

startServer();

function processUserInput(input) {
    eval(input); 
}

function logData(userInput) {
    console.log("User input received: " + userInput);
}

async function fetchData(url) {
    let response = await fetch(url);
    return response.text();
}

process.stdin.on('data', (chunk) => {
    let userData = chunk.toString();
    logData(userData);
    processUserInput(userData);
});
