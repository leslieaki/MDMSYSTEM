import cors from "cors";
import express from "express";
import { createApiRouter } from "./presentation/http/routes";

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());

app.use("/api", createApiRouter());

app.get("/", (_request, response) => {
  response.json({
    service: "mdm-backend",
    status: "running",
    api: "/api"
  });
});

app.listen(port, () => {
  console.log(`MDM backend started: http://localhost:${port}`);
});