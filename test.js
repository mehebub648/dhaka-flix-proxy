// check-down-servers.js
// Run: node check-down-servers.js

const http = require("http");
const https = require("https");

const start = 1;
const end = 255;
const timeoutMs = 3000;

function checkServer(index) {
    return new Promise((resolve) => {
        const url = `http://172.16.50.${index}/DHAKA-FLIX-${index}`;
        const client = url.startsWith("https") ? https : http;

        const request = client.get(url, { timeout: timeoutMs }, (response) => {
            const isUp = response.statusCode >= 200 && response.statusCode < 400;
            response.resume();

            resolve({
                index,
                url,
                status: isUp ? "UP" : "DOWN",
                httpStatus: response.statusCode,
            });
        });

        request.on("timeout", () => {
            request.destroy();
            resolve({
                index,
                url,
                status: "DOWN",
                reason: "Timeout",
            });
        });

        request.on("error", (error) => {
            resolve({
                index,
                url,
                status: "DOWN",
                reason: error.code || error.message,
            });
        });
    });
}

(async () => {
    const indexes = Array.from({ length: end - start + 1 }, (_, i) => i + start);

    console.log(`Checking ${indexes.length} servers...\n`);

    const results = [];
    for (const index of indexes) {
        const result = await checkServer(index);
        results.push(result);
    }

    const downServers = results.filter((result) => result.status === "DOWN");
    const upServers = results.filter((result) => result.status === "UP");

    console.log(`UP: ${upServers.length}`);
    console.log(`DOWN: ${downServers.length}\n`);

    if (downServers.length > 0) {
        console.log("Down servers:");
        for (const server of downServers) {
            console.log(
                `${server.url} -> ${server.reason || `HTTP ${server.httpStatus}`}`
            );
        }
    } else {
        console.log("No down servers found.");
    }
})();
