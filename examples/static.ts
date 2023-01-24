import {Application, Router} from "@oak/mod.ts";
import {LoggerMiddleware, ProxyRouter} from "../mod.ts";
import {serve_files} from "../src/middleware/static.ts";

const app = new Application();
app.use(new LoggerMiddleware().middleware());
app.use(serve_files("examples/public", {
	folder_path_to_index: true,
	file_path_without_html_ext: "redirect_to_html"
}));
app.use(async (ctx) => {
	ctx.response.body = "Oops, Not Found!";
	ctx.response.status = 404;
});

app.listen({port: 8080});
