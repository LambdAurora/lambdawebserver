import { Application, Router } from "@oak/oak";
import { LoggerMiddleware } from "../mod.ts";

const router = new Router();
router.get("/", (ctx) => {
	ctx.response.body = `<!DOCTYPE html>
	<html lang="en">
		<head><title>Hello oak!</title></head>
		<body>
			<h1>Hello world!</h1>
		</body>
	</html>
`;
});

const app = new Application();
app.use(new LoggerMiddleware().middleware());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({ port: 8080 });
