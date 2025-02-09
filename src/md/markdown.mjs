/*
 * Copyright © 2021-2022 LambdAurora <email@lambdaurora.dev>
 *
 * This file is part of lib.md.
 *
 * Licensed under the MIT license. For more information,
 * see the LICENSE file.
 */

import * as html from "../html.mjs";

/**
 * Represents a Markdown node.
 *
 * @version 1.7.0
 * @since 1.7.0
 */
export class Node {
	/**
	 * Returns whether this element should be treated as a block element.
	 *
	 * @return {boolean} `true` if this element should be treated as a block element, otherwise `false`
	 */
	is_block() {
		return false;
	}
}

/**
 * Represents a Markdown element.
 *
 * @version 1.7.0
 * @since 1.0.0
 */
export class Element extends Node {
	/**
	 * @param {string|(Node|string)[]} nodes the inner nodes of the element
	 * @param {boolean} allow_linebreaks `true` if linebreaks are allowed inside this element, else `false`.
	 */
	constructor(nodes = [], allow_linebreaks = true) {
		super();
		if (typeof nodes === "string" || nodes instanceof Element) {
			nodes = [nodes];
		}
		this.nodes = nodes.map(node => {
			if (typeof node === "string") 
				node = new Text(node);
			return node;
		});
		if (!allow_linebreaks)
			this.nodes = purge_linebreaks(this.nodes);
	}

	/**
	 * Pushes a new node in this element.
	 *
	 * @param {string|Node} node the node to push
	 * @return this element
	 */
	push(node) {
		if (typeof node === "string") {
			node = new Text(node);
		}
		this.nodes.push(node);
		return this;
	}

	/**
	 * Returns the nodes of this element as a string.
	 *
	 * @return {string} the nodes as a string
	 */
	get_nodes_as_string() {
		return this.nodes.map(node => node.toString()).join("");
	}

	/**
	 * Returns the element as plain text.
	 *
	 * @return {string} the element as plain text
	 */
	as_plain_text() {
		return this.nodes.map(node => {
			if (node instanceof Text)
				return node.content;
			else
				return node.as_plain_text();
		}).join("");
	}

	toString() {
		return this.get_nodes_as_string();
	}
}

/**
 * Returns the nodes a string with linebreaks.
 *
 * @param nodes the nodes
 * @return {string} the nodes as a string
 */
function to_string_with_linebreaks(nodes) {
	return nodes.map((node, index) => node.toString() + ((index + 1 < nodes.length && !(node instanceof Text && node.is_linebreak())) ? " " : "")).join("");
}

/**
 * Purges the nodes from linebreaks
 *
 * @param nodes the nodes to purge
 */
function purge_linebreaks(nodes) {
	return nodes.filter(node => !(node instanceof Text && node.is_linebreak()));
}

export class Reference {
	constructor(url, tooltip) {
		this.url = url;
		this.tooltip = tooltip;
	}

	/**
	 * Returns whether this reference has a tooltip or not.
	 *
	 * @return {boolean} `true` if this reference has a tooltip, else `false`.
	 */
	has_tooltip() {
		return this.tooltip && this.tooltip !== "";
	}

	toString() {
		return this.url + (this.has_tooltip() ? ` "${this.tooltip}"` : "");
	}
}

/*
 * Inlines
 */

/**
 * Represents a Markdown text node.
 *
 * @version 1.7.0
 * @since 1.0.0
 */
export class Text extends Node {
	/**
	 * @param {string} content the text content
	 */
	constructor(content) {
		super();
		this.content = content;
	}

	is_linebreak() {
		return this.content === "  \n";
	}

	toString() {
		return this.content;
	}

	toJSON() {
		if (this.is_linebreak()) {
			return { type: "linebreak" };
		} else {
			return this.content;
		}
	}
}

/**
 * Represents an emoji.
 *
 * @version 1.2.0
 * @since 1.2.0
 */
export class Emoji extends Text {
	/**
	 * @param {string} id the emoji's id
	 * @param {number|null} skin_tone the skin tome's id
	 */
	constructor(id, skin_tone = null) {
		super(id);
		this.skin_tone = skin_tone;
	}

	is_linebreak() {
		return false;
	}

	/**
	 * Returns whether this emoji has a skin tone specified.
	 *
	 * @returns {boolean} `true` if this emoji has a skin tone, otherwise `false`
	 */
	has_skin_tone() {
		return this.skin_tone !== null;
	}

	toString() {
		if (this.has_skin_tone())
			return `:${super.toString()}::skin-tone-${this.skin_tone}:`;
		else
			return `:${super.toString()}:`;
	}

	toJSON() {
		const json = { type: "emoji", content: this.content };
		if (this.has_skin_tone()) json.skin_tone = this.skin_tone;
		return json;
	}
}

export class InlineCode extends Text {
	/**
	 * @param {string} content the text content
	 */
	constructor(content) {
		super(content);
	}

	is_linebreak() {
		return false;
	}

	toString() {
		const content = super.toString();
		if (content.includes("`")) {
			return "```" + content + "```";
		} else {
			return "`" + content + "`";
		}
	}

	toJSON() {
		return { type: "inline_code", content: this.content };
	}

	as_html() {
		return html.create_element("code").with_child(new html.Text(this.content, html.TextMode.CODE));
	}
}

/**
 * Represents an inline link.
 *
 * @version 1.2.0
 * @since 1.2.0
 */
export class InlineLink extends Text {
	/**
	 * @param {string} link the URL
	 */
	constructor(link) {
		super(link);
	}

	is_linebreak() {
		return false;
	}

	toJSON() {
		return { type: "inline_link", content: this.content };
	}

	as_html() {
		return html.create_element("a").with_attr("href", this.content)
			.with_child(this.content);
	}
}

export const LINEBREAK = new Text("  \n");

/**
 * Represents a comment.
 *
 * @version 1.1.0
 * @since 1.1.0
 */
export class Comment extends Element {
	constructor(comment) {
		super(comment);
	}

	as_html() {
		return new html.Comment(this.toString());
	}
}

export class Italic extends Element {
	/**
	 * @param {string|(Element|Text|string)[]} content the inner nodes of the element
	 */
	constructor(content) {
		super(content, true);
	}

	toString() {
		const content = super.toString();
		if (content.includes("*")) {
			return `_${content}_`;
		} else {
			return `*${content}*`;
		}
	}

	toJSON() {
		return { type: "italic", nodes: this.nodes };
	}
}

export class Bold extends Element {
	/**
	 * @param {string|(Element|Text|string)[]} content the inner nodes of the element
	 */
	constructor(content) {
		super(content, true);
	}

	toString() {
		return `**${super.toString()}**`;
	}

	toJSON() {
		return { type: "bold", nodes: this.nodes };
	}
}

/**
 * Represents an underlined element.
 *
 * This is a non-standard element.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Underline extends Element {
	/**
	 * @param {string|(Element|Text|string)[]} content the inner nodes of the element
	 */
	constructor(content) {
		super(content, true);
	}

	toString() {
		return `__${super.toString()}__`;
	}

	toJSON() {
		return { type: "underline", nodes: this.nodes };
	}
}

export class Strikethrough extends Element {
	/**
	 * @param {string|(Element|Text|string)[]} content the inner nodes of the element
	 */
	constructor(content) {
		super(content, false);
	}

	toString() {
		return `~~${super.toString()}~~`;
	}

	toJSON() {
		return { type: "strikethrough", nodes: this.nodes };
	}
}

/**
 * Represents an highlighted element.
 *
 * This is a non-standard element.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Highlight extends Element {
	/**
	 * @param {string|(Element|Text|string)[]} content the inner nodes of the element
	 */
	constructor(content) {
		super(content, false);
	}

	toString() {
		return `==${super.toString()}==`;
	}

	toJSON() {
		return { type: "highlight", nodes: this.nodes };
	}
}

/**
 * Represents a spoiler element.
 *
 * This is a non-standard element but present in Discord's markdown.
 *
 * Content inside the spoiler element should be hidden when rendered by default.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Spoiler extends Element {
	/**
	 * @param {string|(Element|Text|string)[]} content the inner nodes of the element
	 */
	constructor(content) {
		super(content, false);
	}

	toString() {
		return `||${super.toString()}||`;
	}

	toJSON() {
		return { type: "spoiler", nodes: this.nodes };
	}
}

/**
 * Represents a link.
 *
 * @version 1.2.0
 * @since 1.0.0
 */
export class Link extends Element {
	/**
	 * @param {string} url the URL to link
	 * @param {string|Node|(Node|string)[]} title the title
	 * @param {string|undefined} tooltip the optional tooltip
	 * @param {string|undefined} reference non-empty string if the link is referenced later in the document
	 */
	constructor(url, title, tooltip, reference) {
		if (title === undefined || title === "") {
			title = new Text(url);
		}
		if (reference === undefined)
			reference = "";
		super(title, false);
		this.ref = new Reference(url, tooltip);
		this.ref_name = reference.toLowerCase();
	}

	/**
	 * Returns whether this element has a tooltip or not.
	 *
	 * @return {boolean} `true` if this element has a tooltip, else `false`
	 */
	has_tooltip() {
		return this.ref.has_tooltip();
	}

	toString() {
		const title = super.toString();
		if (this.ref_name) {
			if (this.ref_name === title)
				return `[${title}]`;
			return `[${title}][${this.ref_name}]`;
		}
		return `[${title}](${this.ref.toString()})`;
	}

	toJSON() {
		return { type: "link", url: this.ref.url, title: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name };
	}
}

/**
 * Represents an image.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class Image extends Link {
	constructor(url, alt, tooltip, reference) {
		super(url, alt, tooltip, reference);
	}

	toString() {
		return "!" + super.toString();
	}

	toJSON() {
		return { type: "image", url: this.ref.url, alt: this.nodes, tooltip: this.ref.tooltip, ref_name: this.ref_name };
	}
}

/*
 * Blocks
 */

export class BlockElement extends Element {
	constructor(nodes, allow_linebreaks) {
		super(nodes, allow_linebreaks);
	}

	is_block() {
		return true;
	}
}

export const HeadingLevel = Object.freeze({
	H1: "h1",
	H2: "h2",
	H3: "h3",
	H4: "h4",
	H5: "h5",
	H6: "h6"
});

export class Heading extends BlockElement {
	/**
	 * @param {string|(Element|Text|string)[]} nodes the inner nodes of the element
	 * @param {String} level the heading level
	 */
	constructor(nodes, level) {
		super(nodes, false);
		this.level = level;
	}

	/**
	 * Returns the identifier of this heading.
	 *
	 * @return {string} the identifier
	 */
	get_id() {
		return encodeURI(this.as_plain_text()).replace(/%20/g, "-").toLocaleLowerCase();
	}

	toString() {
		const content = this.nodes.map(node => node.toString()).join(" ");
		switch (this.level) {
			case HeadingLevel.H1:
				return "# " + content;
			case HeadingLevel.H2:
				return "## " + content;
			case HeadingLevel.H3:
				return "### " + content;
			case HeadingLevel.H4:
				return "#### " + content;
			case HeadingLevel.H5:
				return "##### " + content;
			case HeadingLevel.H6:
				return "###### " + content;
			default:
				throw new Error(`lib.md ;; Heading#toString(): invalid heading "${this.level}".`);
		}
	}

	toJSON() {
		return { type: "heading", level: this.level, nodes: this.nodes };
	}
}

export class Paragraph extends BlockElement {
	constructor(nodes) {
		super(nodes);
	}

	toJSON() {
		return { type: "paragraph", nodes: this.nodes };
	}
}

export class BlockCode extends BlockElement {
	constructor(code, language) {
		super([], true);
		this.code = code;
		this.language = language;
	}

	push(code) {
		this.code += code;
		return this;
	}

	/**
	 * Returns whether this code block has a language specified.
	 *
	 * @return {boolean} `true` if this code block has a specified language, else `false`
	 */
	has_language() {
		return this.language && this.language !== "";
	}

	toString() {
		return "```" + (this.has_language() ? this.language + "\n" : "\n") + this.code + "\n```";
	}

	toJSON() {
		return { type: "block_code", code: this.code, language: this.language };
	}
}

export class BlockQuote extends BlockElement {
	constructor(nodes) {
		super(nodes);
	}

	toString() {
		return to_string_with_linebreaks(this.nodes).split("\n").map(quote => `> ${quote}`).join("\n");
	}

	toJSON() {
		return { type: "quote", nodes: this.nodes };
	}
}

/**
 * Represents a horizontal rule.
 *
 * @version 1.2.0
 * @since 1.2.0
 */
export const HORIZONTAL_RULE = Object.freeze({
	 is_block: () => true,
	 toString: () => "---",
	 toJSON: () => { return { type: "horizontal_rule" }; },
	 as_html: () => html.create_element("hr")
});

/**
 * Represents a list.
 *
 * @version 1.2.0
 * @since 1.0.0
 */
export class List extends BlockElement {
	constructor(entries, ordered, ordered_start = 1) {
		super(entries.map(entry => {
			if (entry instanceof ListEntry)
				return entry;
			return new ListEntry([entry], null);
		}), true);
		this.ordered = ordered;
		this.ordered_start = ordered_start;
	}

	/**
	 * Pushes a new entry in this list.
	 *
	 * @param {string|Element} node the node to push
	 * @return {List} this list
	 */
	push(node) {
		if (!(node instanceof ListEntry)) {
			if (node instanceof List)
				node = new ListEntry("", [node]);
			else
				node = new ListEntry([node]);
		}
		return super.push(node);
	}

	/**
	 * Gets the last entry in this list.
	 *
	 * @return {ListEntry} the last entry
	 */
	get_last() {
		return this.nodes[this.nodes.length - 1];
	}

	toString() {
		const entries = this.nodes.map(node => node.toString())
			.map((node, index) => this.ordered ? `${index + this.ordered_start}. ${node}` : `- ${node}`)
			.map(node => node.split("\n")
				.map((node, index) => {
					if (index !== 0)
						return "  " + node;
					else
						return node;
				})
				.join("\n")
			).join("\n");
		return entries;
	}

	toJSON() {
		return { type: "list", entries: this.nodes, ordered: this.ordered, ordered_start: this.ordered_start };
	}
}

export class ListEntry extends Element {
	/**
	 * @param {string|(Element|Text|string)[]} nodes the inner nodes of the element
	 * @param {List[]|null} sublists if present, the sublist of this entry, else `null`
	 * @param {boolean|null} checked `true` or `false` if this entry is a checkbox, else `null`
	 */
	constructor(nodes, sublists = [], checked = null) {
		super(nodes, false);
		this.checked = checked;
		this.sublists = sublists;
		if (!this.sublists)
			this.sublists = [];
	}

	toString() {
		let content = this.nodes.map(block => block.toString()).join("\n");

		if (typeof this.checked === "boolean") {
			content = (this.checked ? "[x] " : "[ ] ") + content;
		}

		if (this.sublists.length > 0) {
			content += "\n" + this.sublists.map(sublist => sublist.toString().split("\n").map(line => "  " + line).join("\n")).join("\n");
		}

		return content;
	}

	toJSON() {
		return { type: "list_entry", nodes: this.nodes, sublists: this.sublists, checked: this.checked };
	}
}

export class InlineHTML extends BlockElement {
	constructor(nodes) {
		super(nodes, true);
	}

	toJSON() {
		return { type: "inline_html", content: this.nodes };
	}
}

export class InlineLatex extends Element {
	constructor(raw, display_mode = false) {
		super([]);
		this.raw = raw;
		this.display_mode = display_mode;
	}

	is_block() {
		return this.display_mode;
	}

	toString() {
		if (this.display_mode)
			return `$$\n${this.raw}\n$$`;
		else
			return `$${this.raw}$`;
	}

	toJSON() {
		return { type: "inline_latex", raw: this.raw, display_mode: this.display_mode };
	}
}

class TableAlignment {
	constructor(name, left, right, style_table_data) {
		this.name = name;
		this.left = left;
		this.right = right;
		this.style_table_data = style_table_data;
	}

	/**
	 * Gets the name of this alignment.
	 *
	 * @returns {string} the name of this alignment
	 */
	get_name() {
		return this.name;
	}

	to_pretty_string(column_length) {
		if (column_length < 5)
			column_length = 5;

		return this.left + "-".repeat(column_length - 2) + this.right;
	}

	toString() {
		return this.left + "---" + this.right;
	}
}

export const TableAlignments = Object.freeze(function() {
	const alignments = {
		NONE: new TableAlignment("none", "-", "-", _ => {}),
		LEFT: new TableAlignment("left", ":", "-", element => element.style("text-align", "left")),
		CENTER: new TableAlignment("center", ":", ":", element => element.style("text-align", "center")),
		RIGHT: new TableAlignment("right", "-", ":", element => element.style("text-align", "right"))
	};
	alignments.CENTERED = alignments.CENTER;
	return alignments;
}());

/**
 * Represents a table.
 *
 * @version 1.2.0
 * @since 1.2.0
 */
export class Table extends BlockElement {
	constructor(nodes = [], alignments = []) {
		super(nodes);
		this.alignments = alignments;

		if (!this.nodes[0])
			this.nodes[0] = new TableRow(this, []);
	}

	push_column(head, data = [], alignment = TableAlignments.NONE) {
		if (head)
			this.get_head().push_column(head);
		this.alignments[this.alignments.length] = alignment;
		data.forEach((row, index) => {
			while (!this.nodes[index + 1]) {
				this.nodes.push(new TableRow(this, []));
			}

			this.nodes[index + 1].push_column(row);
		});
	}

	/**
	 * Gets the alignment of the specified column.
	 *
	 * @param {number} column the column
	 * @return {TableAlignment} the alignment
	 */
	get_alignment(column) {
		if (this.alignments[column])
			return this.alignments[column];
		return TableAlignments.NONE;
	}

	get_head() {
		return this.nodes[0];
	}

	get_body() {
		return this.nodes.filter((_, index) => index !== 0);
	}

	toString() {
		const head_columns = this.get_head().nodes.map(column => column.toString());
		const alignments = "|" + this.alignments
				.map((alignment, index) => alignment.to_pretty_string(head_columns[index] ? head_columns[index].length + 2 : 5))
				.join("|")
			+ "|";

		return "| " + head_columns.join(" | ") + " |\n" + alignments + "\n" + this.get_body().map(row => row.toString()).join("\n");
	}

	toJSON() {
		return { type: "table", rows: this.nodes.map(row => row.toJSON()), alignments: this.alignments.map(alignment => alignment.name) };
	}
}

export class TableRow extends BlockElement {
	/**
	 * @param {Table} table the parent table
	 * @param columns the columns of the row
	 */
	constructor(table, columns = []) {
		super(columns);
		this.table = table;
	}

	push_column(column) {
		if (column instanceof TableEntry) {
			this.nodes.push(column);
		} else {
			this.nodes.push(new TableEntry(this, column));
		}
	}

	toString() {
		return "| " + this.nodes.map(node => node.toString()).join(" | ") + " |";
	}

	toJSON() {
		return { type: "table_row", columns: this.nodes.map(node => node.toJSON()) };
	}
}

export class TableEntry extends BlockElement {
	/**
	 * @param {TableRow} table the parent row
	 * @param nodes the nodes of the entry
	 */
	constructor(row, nodes = []) {
		super(nodes);
		this.row = row;
	}

	toJSON() {
		return { type: "table_entry", nodes: this.nodes.map(node => node.toJSON()) };
	}
}

/**
 * Represents a table of contents.
 *
 * This is a non-standard element.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class TableOfContents extends BlockElement {
	constructor() {
		super([]);
	}

	/**
	 * Returns the table of contents as a standard list.
	 *
	 * @param {MDDocument} doc the Markdown document
	 * @return {List} the equivalent list
	 */
	as_list(doc) {
		const list = new List([], true);

		let headings = doc.blocks.filter(block => block instanceof Heading);
		const allow_h1 = headings.filter(block => block.level === HeadingLevel.H1).length > 1;
		if (!allow_h1) {
			headings = headings.filter(block => block.level !== HeadingLevel.H1);
		}

		let current = [list];

		function push_heading(list, heading) {
			list.push(new ListEntry([new Paragraph([new Link(`#${heading.get_id()}`, heading.nodes)])]));
		}

		headings.forEach(heading => {
			let level = parseInt(heading.level[1]);
			if (!allow_h1)
				level--;

			if (level !== 1) {
				while (!current[level - 1])
					level--;
			}

			if (level === 1) {
				push_heading(list, heading);
				current = [list]; // Time to rebuild.
				current[1] = list.get_last();
			} else {
				if (current.length > level + 1) {
					current.splice(level);
				}

				const parent = current[level - 1];
				if (parent.sublists.length === 0) {
					parent.sublists.push(new List([], true));
				}

				const parent_list = parent.sublists[parent.sublists.length - 1];
				push_heading(parent_list, heading);
				current[level] = parent_list.get_last();
			}
		});

		return list;
	}

	toString() {
		return "[[ToC]]";
	}

	toJSON() {
		return { type: "table_of_contents" };
	}
}

/**
 * Gets all "external" references in the element nodes.
 * It will search for a Link or Image object and checks whether it has an "external" reference or not, if it has it will add it in the returning array.
 *
 * @param {Element} element the current element to extract references
 */
function get_references(element) {
	// References are only present in Link and Image and Image extends Link.
	if (element instanceof Link) {
		// Checks if it uses "external" reference.
		if (element.ref_name !== "") {
			return {name: element.ref_name, ref: element.ref};
		}
	// Not a Link or Image? Then retry with its child nodes.
	} else if (element instanceof Element) {
		return element.nodes.map(node => get_references(node)).filter(node => node !== undefined).flat();
	}
}

export class MDDocument {
	constructor(blocks) {
		if (blocks === undefined)
			blocks = [];
		this.blocks = blocks;
		this.references = [];
	}

	/**
	 * Pushes a block element in this document.
	 *
	 * @param {BlockElement|Text|string} block the block to push
	 * @return {MDDocument} this document
	 */
	push(block) {
		if (typeof block === "string")
			block = new Text(block);
		if (block instanceof Text)
			block = new Paragraph([block]);
		this.blocks.push(block);
		return this;
	}

	/**
	 * Pushes a new reference in this document.
	 *
	 * @param {string} name the reference name
	 * @param {Reference} reference the reference to push
	 * @return {MDDocument} this document
	 */
	ref(name, reference) {
		if (!this.has_ref(name))
			this.references.push({ name: name.toLowerCase(), ref: reference });
		return this;
	}

	/**
	 * Returns whether this document has a reference or not.
	 *
	 * @param {string} name the reference name
	 * @return {boolean} `true` if the reference is found, else `false`
	 */
	has_ref(name) {
		name = name.toLowerCase();
		return this.references.find(ref => ref.name === name);
	}

	/**
	 * Clears this document.
	 *
	 * @return {MDDocument} this document
	 */
	clear() {
		this.blocks = [];
		this.references = [];
		return this;
	}

	toString() {
		let references = this.references;
		this.blocks.forEach(block => references = references.concat(get_references(block)));
		return this.blocks.map(block => block.toString() + "\n").join("\n")
			+ (references.length !== 0 ? "\n" + references.filter(ref => ref.ref.url !== undefined).map(ref => `[${ref.name}]: ${ref.ref.toString()}`).filter((v, i, arr) => arr.indexOf(v) === i).join("\n")
				+ "\n" : "");
	}

	toJSON() {
		return {
			blocks: this.blocks.map(block => block.toJSON()),
			references: this.references
		}
	}
}
