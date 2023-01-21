import {Application, Router} from "@oak/mod.ts";
import {LoggerMiddleware, ProxyRouter} from "../mod.ts";

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

const proxy = new ProxyRouter();

proxy.all("/AurorasDecorations", "https://lambdaurora.dev/AurorasDecorations", {
	path_mode: "root",
	redirect: "rewrite"
});

const app = new Application();
app.use(new LoggerMiddleware().middleware());
app.use(proxy.proxy());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({port: 8080});
