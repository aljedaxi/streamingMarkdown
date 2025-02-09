import { md, html } from "../../mod.mjs";
import katex from "https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.mjs"; // For inline LaTeX rendering
import "https://cdn.jsdelivr.net/npm/emoji-js@3.6.0/lib/emoji.min.js";

{
	const splitter = document.getElementById("splitter");
	const editor = document.getElementById("editor");
	const preview = document.getElementById("preview");

	let editor_value = 50;
	const preview_value = () => 100 - editor_value;

	function apply() {
		editor.style.flexBasis = `calc(${editor_value}% - 4px)`;
		preview.style.flexBasis = `calc(${preview_value()}% - 4px)`;
	}

	apply();

	let data = null;

	splitter.addEventListener("mousedown", e => {
		data = { old_x: e.clientX, old_y: e.clientY };
	});

	splitter.parentElement.addEventListener("mouseup", e => {
		data = null;
	});

	splitter.parentElement.addEventListener("mousemove", e => {
		if (!data) return;

		const delta = { x: e.clientX - data.old_x - 8, y: e.clientY - data.old_y };

		delta.x = delta.x / (editor.parentElement.scrollWidth) * 100;

		editor_value = 50 + delta.x;
		apply();
	})
}

const markdown_preview = document.getElementById("markdown_preview");

const emoji = new EmojiConvertor();
emoji.img_set = "twitter";
// Hi, let's use Twemoji for the demo (https://twemoji.twitter.com/).
emoji.img_sets.twitter.path = "https://twemoji.maxcdn.com/v/latest/72x72/";
// Fix the heart emoji.
emoji.data["2764"] = emoji.data["2764-fe0f"];
delete emoji.data["2764-fe0f"];
emoji.init_colons();

let parser_options = {
	auto_link: true,
	emoji: {
		dictionary: Object.keys(emoji.map.colons)
	},
	latex: true,
	newline_as_linebreaks: false
};
let render_options = {
	emoji: node => {
		return html.parse(emoji.replace_colons(node.toString()));
	},
	image: { class_name: "ls_responsive_img" },
	latex: {
		katex: katex
	},
	spoiler: { enable: true },
	table: {
		process: t => {
			t.attr("class", "ls_grid_table");
		}
	},
	parent: markdown_preview
};

const textarea = document.getElementById("markdown_editor");
const checkbox_newline_as_linebreaks = document.getElementById("newline_as_linebreaks");
const checkbox_indent_as_code = document.getElementById("indent_as_code");

if (localStorage.getItem("text")) {
	textarea.value = localStorage.getItem("text");
}

textarea.addEventListener("input", render);
checkbox_newline_as_linebreaks.addEventListener("click", render);
checkbox_indent_as_code.addEventListener("click", render);

function render() {
	parser_options.newline_as_linebreaks = checkbox_newline_as_linebreaks.checked;
	parser_options.code_block_from_indent = checkbox_indent_as_code.checked;

	localStorage.setItem("text", textarea.value);

	let start = new Date().getTime();
	let markdown_doc = md.parser.parse(textarea.value, parser_options);
	console.log(markdown_doc);
	console.log("Parsed in: " + (new Date().getTime() - start) + "ms");

	markdown_preview.innerHTML = "";
	start = new Date().getTime();
	md.render(markdown_doc, document, render_options);

	console.log("Rendered Markdown in: " + (new Date().getTime() - start) + "ms");

	// Highlight all code blocks.
	for (const element of markdown_preview.querySelectorAll("pre code[class*='language-']")) {
		Prism.highlightElement(element);
	}

	console.log("Rendered in: " + (new Date().getTime() - start) + "ms");

	document.querySelectorAll(".spoiler_hidden").forEach(spoiler => {
		spoiler.addEventListener("click", _ => {
			spoiler.classList.remove("spoiler_hidden");
		});
	});
}

render();
