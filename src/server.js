import fastify from "fastify";

const app = fastify();

app.get("/health", async (request, reply) => {
  return { ok: true  };
});

const port = process.env.PORT || 3000;
app.listen({ port }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  console.log(`🚀 Server running at ${address}`);
});