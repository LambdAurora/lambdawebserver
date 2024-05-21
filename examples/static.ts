import { Application } from "@oak/oak";
import { LoggerMiddleware, serve_files } from "../mod.ts";

const app = new Application();
app.use(new LoggerMiddleware().middleware());
app.use(serve_files("examples/public", {
	folder_path_to_index: true,
	file_path_without_html_ext: "redirect_to_html",
}));
app.use((ctx) => {
	ctx.response.body = "Oops, Not Found!";
	ctx.response.status = 404;
});

app.listen({ port: 8080 });
