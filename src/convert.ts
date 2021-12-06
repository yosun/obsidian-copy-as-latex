import { App, Editor, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {fromMarkdown} from 'mdast-util-from-markdown'

import { syntax } from 'micromark-extension-wiki-link'
import * as wikiLink from 'mdast-util-wiki-link'
import {gfm} from 'micromark-extension-gfm'
import {gfmFromMarkdown, gfmToMarkdown} from 'mdast-util-gfm'

import { Code, Heading, Link, List, Node, Parent } from 'mdast-util-from-markdown/lib';
import { Literal } from 'mdast';

// Conversions go from a Node with a certain amount of indentation to a string
type Convert = (a:Node,indent:number) => string

/*
 * Overall function to carry out the conversion
 */
export function ASTtoString(input:Node,indent:number=0) : string {
	var t = input.type;


	const transforms : { [key:string] : Convert } = {
		'root': wrapper("\n",""),
		'paragraph': wrapper("","\n"),
		'emphasis': (a:Node) => {return "\\emph{" + wrapper("","")(a) + "}"},
		'strong': (a:Node) => {return "\\textbf{" + wrapper("","")(a) + "}"},
		'delete': (a:Node) => {return "\\st{" + wrapper("","")(a) + "}"},
		'footnote': (a:Node) => {return "\\footnote{" + wrapper("","")(a) + "}"},
		'list' : list,
		'listItem': (a:Node) => {return "\t".repeat(indent) + "\\item " + wrapper("","")(a,indent) },
		'heading': heading,
		'wikiLink': internalLink,
		'link': externalLink,
		'code': code
	}
	const f:Convert = transforms[input.type] || defaultC
	const trans = f(input,indent)
	return   trans
}

/*
 * Individual functions to convert elements
 */

const defaultC : Convert = (a:Node,indent:number=0) => {return (a as Literal).value};
const wrapper = (jn:string,aft:string) => (a:Node,indent:number=0) => {return (
	(a as Parent).children.map((c) => ASTtoString(c,indent)).join(jn)) + aft};
const heading = (a:Node,indent:number=0) => {
	const h = a as Heading
	var sec = "section"
	if( h.depth == 2 ) sec = "subsection"
	if( h.depth == 3 ) sec = "subsubsection"
	return "\\" + sec + "{" + ASTtoString((a as Parent).children[0]) + "}\n"
}

const list = (a:Node,indent:number=0) => {
	const h = a as List
	var sec = h.ordered ? "enumerate" : "itemize"
	return "\t".repeat(indent) + "\\begin{" + sec + "}\n" + 
		wrapper("","")(a,indent+1) +
		"\t".repeat(indent) + "\\end{" + sec + "}\n"
}
const internalLink = (a:Node,indent:number=0) => {
	const h = a as wikiLink
	const url:string = h.value
	if(url.startsWith("@") ) { return "\\cite{" + url.substring(1) + "}" }
	if(url.startsWith("^") ) { return "\\ref{" + url.substring(1) + "}" }
	return url 
}
const externalLink = (a:Node,indent:number=0) => {
	const l = a as Link
	console.log("Got a link!")
	console.log(a)
	return "\\url{" + l.url + "}"
}

const code = (a:Node,indent:number=0) => {
	const cd = a as Code
	return `\\begin{lstlisting}[language=${cd.lang}]
${cd.value}
\\end{lstlisting}
`
}
