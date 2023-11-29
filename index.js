import http from "http";
import notifier from "node-notifier";
import clipboardy from "clipboardy";
import open from "open";
const port = 3000; // You can choose any port that's open

const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const parsedBody = JSON.parse(body);
      console.log("Data received from iPhone:", parsedBody);

      clipboardy.writeSync(parsedBody.content);

      notifier.notify({
        title: "New content from iPhone",
        message: `Content: ${parsedBody.content}`,
      });

      const { content } = parsedBody;

      if (content.startsWith("https") || content.startsWith("http")) {
        console.log("Link detected, opening the url in your default browser!");
        open(content);
      }
      console.log("Notification sent!");
      res.end("Content received");
    });
  }
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
