/** JUSH - JavaScript Syntax Highlighter
* @link http://jush.sourceforge.net
* @author Jakub Vrana, http://php.vrana.cz
* @copyright 2007 Jakub Vrana
* @license http://www.apache.org/licenses/LICENSE-2.0 Apache License, Version 2.0
* @version $Date::                           $
*/

/* Limitations:
<style> and <script> supposes CDATA or HTML comments
unnecessary escaping (e.g. echo "\'" or ='&quot;') is removed
*/

var jush = {
	create_links: true,
	
	sql_function: 'mysql_db_query|mysql_query|mysql_unbuffered_query|mysqli_master_query|mysqli_multi_query|mysqli_query|mysqli_real_query|mysqli_rpl_query_type|mysqli_send_query|mysqli_stmt_prepare',
	sqlite_function: 'sqlite_query|sqlite_unbuffered_query|sqlite_single_query|sqlite_array_query|sqlite_exec',
	pgsql_function: 'pg_prepare|pg_query|pg_query_params|pg_send_prepare|pg_send_query|pg_send_query_params',

	style: function (href) {
		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = href;
		document.getElementsByTagName('head')[0].appendChild(link);
	},

	highlight: function (language, text) {
		this.last_tag = '';
		return '<span class="jush">' + this.highlight_states([ language ], text.replace(/\r\n?/g, '\n'), !/^(htm|tag|xml)$/.test(language))[0] + '</span>';
	},

	highlight_tag: function (tag, tab_width) {
		var pre = (typeof tag == 'string' ? document.getElementsByTagName(tag) : tag);
		var tab = '';
		for (var i = (tab_width !== undefined ? tab_width : 4); i--; ) {
			tab += ' ';
		}
		for (var i=0; i < pre.length; i++) {
			var match = /(^|\s)jush($|\s|-(\S+))/.exec(pre[i].className);
			if (match) {
				var s = this.highlight(match[3] ? match[3] : 'htm', this.html_entity_decode(pre[i].innerHTML.replace(/<br(\s+[^>]*)?>/gi, '\n').replace(/<[^>]*>/g, ''))).replace(/\t/g, tab.length ? tab : '\t').replace(/(^|\n| ) /g, '$1&nbsp;');
				if (pre[i].outerHTML && /^pre$/i.test(pre[i].tagName)) {
					pre[i].outerHTML = pre[i].outerHTML.match(/[^>]+>/)[0] + s + '</' + pre[i].tagName + '>';
				} else {
					pre[i].innerHTML = s.replace(/\n/g, '<br />');
				}
			}
		}
	},

	keywords_links: function (state, s) {
		if (/^js(_write|_code)+$/.test(state)) {
			state = 'js';
		}
		if (/^(php_quo_var|php_sql|php_sqlite|php_pgsql|php_echo|php_phpini|php_http)$/.test(state)) {
			state = 'php';
		}
		if (this.links2 && this.links2[state]) {
			var url = this.urls[state];
			var links2 = this.links2[state];
			s = s.replace(links2, function (str) {
				for (var i=arguments.length - 4; i > 0; i--) {
					if (arguments[i]) {
						var link = (/^http:/.test(url[i]) ? url[i] : url[0].replace(/\$key/g, url[i]));
						switch (state) {
							case 'php': link = link.replace(/\$1/g, arguments[i].toLowerCase()); break;
							case 'phpini': link = link.replace(/\$1/g, arguments[i].replace(/_/g, '-')); break;
							case 'php_doc': link = link.replace(/\$1/g, arguments[i].replace(/^\W*/, '')); break;
							case 'sql': link = link.replace(/\$1/g, arguments[i].replace(/\b(ALTER|CREATE|DROP|RENAME|SHOW)\s+SCHEMA\b/, '$1 DATABASE').toLowerCase().replace(/\s+|_/g, '-')); break;
							case 'sqlset': link = link.replace(/\$1/g, (links2.test(arguments[i].replace(/_/g, '-')) ? arguments[i].replace(/_/g, '-') : arguments[i]).toLowerCase()); break;
							case 'sqlite': link = link.replace(/\$1/g, arguments[i].toLowerCase().replace(/\s+/g, '')); break;
							case 'pgsql': link = link.replace(/\$1/g, arguments[i].toLowerCase().replace(/\s+/g, (i == 1 ? '-' : ''))); break;
							case 'cnf': link = link.replace(/\$1/g, arguments[i].toLowerCase()); break;
							case 'js': link = link.replace(/\$1/g, arguments[i].replace(/\./g, '/')); break;
							default: link = link.replace(/\$1/g, arguments[i]);
						}
						return '<a' + (jush.create_links && url[i] ? ' href="' + link + '"' + (typeof jush.create_links == 'string' ? jush.create_links : '') : '') + '>' + arguments[i] + '</a>' + (arguments[arguments.length - 3] ? arguments[arguments.length - 3] : '');
					}
				}
			});
		}
		return s;
	},

	build_regexp: function (tr1, in_php, state) {
		var re = [ ];
		for (var k in tr1) {
			var s = tr1[k].toString().replace(/^\/|\/[^\/]*$/g, '');
			if ((!in_php || k != 'php') && (state == 'htm' || (s != '(<)(\\/script)(>)' && s != '(<)(\\/style)(>)'))) {
				re.push(s);
			} else {
				delete tr1[k];
			}
		}
		return new RegExp(re.join('|'), 'gi');
	},
	
	highlight_states: function (states, text, in_php, escape) {
		var php = /<\?(?!xml)(?:php)?|<script\s+language\s*=\s*(?:"php"|'php'|php)\s*>/i; // asp_tags=0, short_open_tag=1
		var num = /(?:\b[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/;
		var tr = { // transitions
			htm: { php: php, tag_css: /(<)(style)\b/i, tag_js: /(<)(script)\b/i, htm_com: /<!--/, tag: /(<)(\/?[-\w\d]+)/, ent: /&/ },
			htm_com: { php: php, 1: /-->/ },
			ent: { php: php, 1: /[;\s]/ },
			tag: { php: php, att_css: /(\s+)(style)(\s*=\s*)/i, att_js: /(\s+)(on[-\w\d]+)(\s*=\s*)/i, att_http: /(\s+)(http-equiv)(\s*=\s*)/i, att: /(\s+)([-\w\d]+)()/, 1: />/ },
			tag_css: { php: php, att: /(\s+)([-\w\d]+)()/, css: />/ },
			tag_js: { php: php, att: /(\s+)([-\w\d]+)()/, js: />/ },
			att: { php: php, att_quo: /\s*=\s*"/, att_apo: /\s*=\s*'/, att_val: /\s*=\s*/, 1: /()/ },
			att_css: { php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/ },
			att_js: { php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/ },
			att_http: { php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/ },
			att_quo: { php: php, 2: /"/ },
			att_apo: { php: php, 2: /'/ },
			att_val: { php: php, 2: /(?=>|\s)|$/ },
			
			xml: { php: php, htm_com: /<!--/, xml_tag: /(<)(\/?[-\w\d]+)/, ent: /&/ },
			xml_tag: { php: php, xml_att: /(\s+)([-\w\d]+)()/, 1: />/ },
			xml_att: { php: php, att_quo: /\s*=\s*"/, att_apo: /\s*=\s*'/, att_val: /\s*=\s*/, 1: /()/ },
			
			css: { php: php, quo: /"/, apo: /'/, com: /\/\*/, css_at: /(@)([^;\s{]+)/, css_pro: /\{/, 2: /(<)(\/style)(>)/i },
			css_at: { php: php, quo: /"/, apo: /'/, com: /\/\*/, css_at2: /\{/, 1: /;/ },
			css_at2: { php: php, quo: /"/, apo: /'/, com: /\/\*/, css_at: /@/, css_pro: /\{/, 2: /}/ },
			css_pro: { php: php, com: /\/\*/, css_val: /(\s*)([-\w\d]+)(\s*:)/, 1: /}/ }, //! misses e.g. margin/*-left*/:
			css_val: { php: php, quo: /"/, apo: /'/, css_js: /expression\s*\(/i, com: /\/\*/, clr: /#/, num: /[-+]?[0-9]*\.?[0-9]+(?:em|ex|px|in|cm|mm|pt|pc|%)?/, 1: /;|$/, 2: /}/ },
			css_js: { php: php, css_js: /\(/, 1: /\)/ },
			quo: { php: php, esc: /\\/, 1: /"/ },
			apo: { php: php, esc: /\\/, 1: /'/ },
			com: { php: php, 1: /\*\// },
			esc: { 1: /./ }, //! php_quo allows [0-7]{1,3} and x[0-9A-Fa-f]{1,2}
			one: { 1: /\n/ },
			clr: { 1: /(?=[^a-fA-F0-9])|$/ },
			num: { 1: /()/ },
			
			js: { php: php, js_reg: /\s*\/(?![\/*])/, js_code: /()/ },
			js_code: { php: php, quo: /"/, apo: /'/, js_one: /\/\//, com: /\/\*/, num: num, js_write: /(\b)(write(?:ln)?)(\()/, 3: /(<)(\/script)(>)/i, 1: /[^\])}$\w\d\s]/ },
			js_write: { php: php, js_reg: /\s*\/(?![\/*])/, js_write_code: /()/ },
			js_write_code: { php: php, quo: /"/, apo: /'/, js_one: /\/\//, com: /\/\*/, num: num, js_write: /\(/, 2: /\)/, 1: /[^\])}$\w\d\s]/ },
			js_one: { php: php, 1: /\n/, 3: /(<)(\/script)(>)/i },
			js_reg: { php: php, esc: /\\/, 1: /\/[a-z]*/i }, //! highlight regexp
			
			php: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_doc: /\/\*\*/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_new: /(\b)(new)\b/i, php_sql: new RegExp('(\\b)(' + this.sql_function + ')(\\s*\\()', 'i'), php_sqlite: new RegExp('(\\b)(' + this.sqlite_function + ')(\\s*\\()', 'i'), php_pgsql: new RegExp('(\\b)(' + this.pgsql_function + ')(\\s*\\()', 'i'), php_echo: /(\b)(echo|print)\b/i, php_halt: /(\b)(__halt_compiler)(\s*\(\s*\))/i, php_var: /\$/, num: num, php_phpini: /(\b)(ini_get|ini_set)(\s*\()/i, php_http: /(\b)(header)(\s*\()/i, 1: /\?>|<\/script>/i }, //! matches ::echo
			php_quo_var: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_new: /(\b)(new)\b/i, php_sql: new RegExp('(\\b)(' + this.sql_function + ')(\\s*\\()', 'i'), php_sqlite: new RegExp('(\\b)(' + this.sqlite_function + ')(\\s*\\()', 'i'), php_pgsql: new RegExp('(\\b)(' + this.pgsql_function + ')(\\s*\\()', 'i'), 1: /}/ },
			php_echo: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_new: /(\b)(new)\b/i, php_sql: new RegExp('(\\b)(' + this.sql_function + ')(\\s*\\()', 'i'), php_sqlite: new RegExp('(\\b)(' + this.sqlite_function + ')(\\s*\\()', 'i'), php_pgsql: new RegExp('(\\b)(' + this.pgsql_function + ')(\\s*\\()', 'i'), php_echo: /\(/, php_var: /\$/, num: num, php_phpini: /(\b)(ini_get|ini_set)(\s*\()/i, 1: /\)|;/, 2: /\?>|<\/script>/i },
			php_sql: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_sql: /\(/, php_var: /\$/, num: num, 1: /\)/ },
			php_sqlite: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_sqlite: /\(/, php_var: /\$/, num: num, 1: /\)/ },
			php_pgsql: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_pgsql: /\(/, php_var: /\$/, num: num, 1: /\)/ },
			php_phpini: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_phpini: /\(/, php_var: /\$/, num: num, 1: /[,)]/ },
			php_http: { php_quo: /"/, php_apo: /'/, php_bac: /`/, php_one: /\/\/|#/, php_com: /\/\*/, php_eot: /<<<[ \t]*/, php_http: /\(/, php_var: /\$/, num: num, 1: /\)/ },
			php_new: { php_one: /\/\/|#/, php_com: /\/\*/, 1: /[_a-zA-Z0-9\x7F-\xFF]+/ },
			php_one: { 1: /\n|(?=\?>)|$/ },
			php_eot: { php_eot2: /([^'"\n]+)(['"]?)/ },
			php_eot2: { php_quo_var: /\$\{|\{\$/, php_var: /\$/ }, // php_eot2[2] to be set in php_eot handler
			php_quo: { php_quo_var: /\$\{|\{\$/, php_var: /\$/, esc: /\\/, 1: /"/ },
			php_bac: { php_quo_var: /\$\{|\{\$/, php_var: /\$/, esc: /\\/, 1: /`/ }, //! highlight shell
			php_var: { 1: /(?=[^_a-zA-Z0-9\x7F-\xFF])|$/ },
			php_apo: { esc: /\\/, 1: /'/ },
			php_doc: { 1: /\*\// },
			php_com: { 1: /\*\// },
			php_halt: { php_halt_one: /\/\/|#/, php_com: /\/\*/, php_halt2: /;|\?>\n?/ },
			php_halt_one: { 1: /\n|(?=\?>)|$/ },
			php_halt2: { 3: /$/ },
			
			phpini: { 0: /$/ },
			http: { 0: /$/ },
			
			sql: { sql_apo: /'/, sql_quo: /"/, bac: /`/, one: /-- |#|--(?=\n|$)/, com_code: /\/\*![0-9]*|\*\//, com: /\/\*/, sql_var: /\B@/, sql_sqlset: /(\b)(SET(?:\s+GLOBAL|\s+SESSION)?)(\s+)/i, num: num },
			sql_sqlset: { 1: /(?=[^_a-zA-Z0-9])|$/ },
			sqlset: { 0: /$/ },
			sqlstatus: { 0: /$/ },
			com_code: { 1: /()/ },
			sqlite: { sqlite_apo: /'/, sqlite_quo: /"/, bra: /\[/, one: /--/, com: /\/\*/, sql_var: /[:@$]/, num: num },
			pgsql: { sql_apo: /'/, sqlite_quo: /"/, sql_eot: /\$/, one: /--/, com_nest: /\/\*/, num: num }, // standard_conforming_strings=off
			sql_apo: { esc: /\\/, 0: /''/, 1: /'/ },
			sql_quo: { esc: /\\/, 0: /""/, 1: /"/ },
			sql_var: { 1: /(?=[^_.$a-zA-Z0-9])|$/ },
			sqlite_apo: { 0: /''/, 1: /'/ },
			sqlite_quo: { 0: /""/, 1: /"/ },
			sql_eot: { sql_eot2: /\$/ },
			sql_eot2: { }, // sql_eot2[2] to be set in sql_eot handler
			com_nest: { com_nest: /\/\*/, 1: /\*\// },
			bac: { 1: /`/ },
			bra: { 1: /]/ },
			
			cnf: { quo: /"/, one: /#/, cnf_php: /(\b)(PHPIniDir)([ \t]+)/i, cnf_phpini: /(\b)(php_value|php_flag|php_admin_value|php_admin_flag)([ \t]+)/i },
			cnf_php: { 1: /()/ },
			cnf_phpini: { cnf_phpini_val: /[ \t]/ },
			cnf_phpini_val: { apo: /'/, quo: /"/, 2: /($|\n)/ }
		};
		var regexps = { };
		for (var key in tr) {
			regexps[key] = this.build_regexp(tr[key], in_php, states[0]);
		}
		var ret = [ ]; // return
		for (var i=1; i < states.length; i++) {
			ret.push('<span class="jush-' + states[i] + '">');
		}
		var state = states[states.length - 1];
		var match;
		var child_states = [ ];
		var s_states;
		var start = 0;
		loop: while (start < text.length && (match = regexps[state].exec(text))) {
			for (var key in tr[state]) {
				var m = tr[state][key].exec(match[0]);
				if (m && !m.index && m[0].length == match[0].length) { // check index and length to allow '/' before '</script>'
					//~ console.log(states + ' (' + key + '): ' + text.substring(start).replace(/\n/g, '\\n'));
					var division = match.index + (key == 'php_halt2' ? match[0].length : 0);
					var s = text.substring(start, division);
					
					// highlight children
					var prev_state = states[states.length - 2];
					if (/^(att_quo|att_apo|att_val)$/.test(state) && (/^(att_js|att_css|att_http)$/.test(prev_state) || /^\s*javascript:/i.test(s))) { // javascript: - easy but without own state //! should be checked only in %URI;
						child_states.unshift(prev_state == 'att_css' ? 'css_pro' : (prev_state == 'att_http' ? 'http' : 'js'));
						s_states = this.highlight_states(child_states, this.html_entity_decode(s), true, (state == 'att_apo' ? this.htmlspecialchars_apo : (state == 'att_quo' ? this.htmlspecialchars_quo : this.htmlspecialchars_quo_apo)));
					} else if (state == 'css_js' || state == 'cnf_phpini' || state == 'sql_sqlset') {
						child_states.unshift(state.substr(4));
						s_states = this.highlight_states(child_states, s, true);
					} else if ((state == 'php_quo' || state == 'php_apo') && /^(php_sql|php_sqlite|php_pgsql|php_phpini|php_http)$/.test(prev_state)) {
						child_states.unshift(prev_state.substr(4));
						s_states = this.highlight_states(child_states, this.stripslashes(s), true, (state == 'php_apo' ? this.addslashes_apo : this.addslashes_quo));
					} else if (key == 'php_halt2') {
						child_states.unshift('htm');
						s_states = this.highlight_states(child_states, s, true);
					} else if ((state == 'apo' || state == 'quo') && prev_state == 'js_write_code') {
						child_states.unshift('htm');
						s_states = this.highlight_states(child_states, s, true);
					} else if (((state == 'php_quo' || state == 'php_apo') && prev_state == 'php_echo') || (state == 'php_eot2' && states[states.length - 3] == 'php_echo')) {
						var i;
						for (i=states.length; i--; ) {
							prev_state = states[i];
							if (prev_state.substring(0, 3) != 'php' && prev_state != 'att_quo' && prev_state != 'att_apo' && prev_state != 'att_val') {
								break;
							}
							prev_state = '';
						}
						var f = (state == 'php_eot2' ? this.addslashes : (state == 'php_apo' ? this.addslashes_apo : this.addslashes_quo));
						s = this.stripslashes(s);
						if (/^(att_js|att_css|att_http)$/.test(prev_state)) {
							var g = (states[i+1] == 'att_quo' ? this.htmlspecialchars_quo : (states[i+1] == 'att_apo' ? this.htmlspecialchars_apo : this.htmlspecialchars_quo_apo));
							child_states.unshift(prev_state == 'att_js' ? 'js' : prev_state.substr(4));
							s_states = this.highlight_states(child_states, this.html_entity_decode(s), true, function (string) { return f(g(string)); });
						} else if (prev_state && child_states) {
							child_states.unshift(prev_state);
							s_states = this.highlight_states(child_states, s, true, f);
						} else {
							s = this.htmlspecialchars(s);
							s_states = [ (escape ? escape(s) : s), (isNaN(+key) || !/^(att_js|att_css|att_http|css_js|js_write_code|php_sql|php_sqlite|php_pgsql|php_echo|php_phpini|php_http)$/.test(state) ? child_states : [ ]) ];
						}
					} else {
						s = this.htmlspecialchars(s);
						s_states = [ (escape ? escape(s) : s), (isNaN(+key) || !/^(att_js|att_css|att_http|css_js|js_write_code|php_sql|php_sqlite|php_pgsql|php_echo|php_phpini|php_http)$/.test(state) ? child_states : [ ]) ]; // reset child states when escaping construct
					}
					s = s_states[0];
					child_states = s_states[1];
					s = this.keywords_links(state, s);
					ret.push(s);
					
					s = text.substring(division, match.index + match[0].length);
					s = (m.length < 3 ? (s ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(s) : s) + '</span>' : '') : (m[1] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[1]) : m[1]) + '</span>' : '') + this.htmlspecialchars(escape ? escape(m[2]) : m[2]) + (m[3] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[3]) : m[3]) + '</span>' : ''));
					if (isNaN(+key)) {
						if (this.links && this.links[key] && m[2]) {
							if (/^tag/.test(key)) {
								this.last_tag = m[2].toUpperCase();
							}
							var link = (/^tag/.test(key) && !/^(ins|del)$/i.test(m[2]) ? m[2].toUpperCase() : m[2].toLowerCase());
							var k_link = '';
							var att_mapping = {
								'align-APPLET': 'IMG', 'align-IFRAME': 'IMG', 'align-INPUT': 'IMG', 'align-OBJECT': 'IMG',
								'align-COL': 'TD', 'align-COLGROUP': 'TD', 'align-TBODY': 'TD', 'align-TFOOT': 'TD', 'align-TH': 'TD', 'align-THEAD': 'TD', 'align-TR': 'TD',
								'border-OBJECT': 'IMG',
								'cite-BLOCKQUOTE': 'Q',
								'cite-DEL': 'INS',
								'color-BASEFONT': 'FONT',
								'face-BASEFONT': 'FONT',
								'height-TD': 'TH',
								'height-OBJECT': 'IMG',
								'longdesc-IFRAME': 'FRAME',
								'name-TEXTAREA': 'BUTTON',
								'name-IFRAME': 'FRAME',
								'name-OBJECT': 'INPUT',
								'src-IFRAME': 'FRAME',
								'type-LINK': 'A',
								'width-OBJECT': 'IMG',
								'width-TD': 'TH'
							};
							var att_tag = (att_mapping[link + '-' + this.last_tag] ? att_mapping[link + '-' + this.last_tag] : this.last_tag);
							for (var k in this.links[key]) {
								if (key == 'att' && this.links[key][k].test(link + '-' + att_tag)) {
									link += '-' + att_tag;
									k_link = k;
									break;
								} else if (this.links[key][k].test(m[2])) {
									k_link = k;
									if (key != 'att') {
										break;
									}
								}
							}
							if (k_link) {
								s = (m[1] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[1]) : m[1]) + '</span>' : '');
								s += '<a' + (this.create_links ? ' href="' + this.urls[key].replace(/\$key/, k_link).replace(/\$val/, link) + '"' + (typeof this.create_links == 'string' ? this.create_links : '') : '') + '>' + this.htmlspecialchars(escape ? escape(m[2]) : m[2]) + '</a>';
								s += (m[3] ? '<span class="jush-op">' + this.htmlspecialchars(escape ? escape(m[3]) : m[3]) + '</span>' : '');
							}
						}
						ret.push('<span class="jush-' + key + '">', s);
						states.push(key);
						if (state == 'php_eot') {
							tr.php_eot2[2] = new RegExp('(\n)(' + match[1] + ')(;?\n)');
							regexps.php_eot2 = this.build_regexp((match[2] == "'" ? { 2: tr.php_eot2[2] } : tr.php_eot2));
						} else if (state == 'sql_eot') {
							tr.sql_eot2[2] = new RegExp('\\$' + text.substring(start, match.index) + '\\$');
							regexps.sql_eot2 = this.build_regexp(tr.sql_eot2);
						}
					} else if (states.length <= key) {
						return [ this.htmlspecialchars(text), [ ] ]; // out of states
					} else {
						ret.push(s);
						for (var i=0; i < key; i++) {
							ret.push('</span>');
							states.pop();
						}
					}
					start = match.index + match[0].length;
					state = states[states.length - 1];
					regexps[state].lastIndex = start;
					continue loop;
				}
			}
			return [ 'regexp not found', [ ] ];
		}
		ret.push(this.keywords_links(state, this.htmlspecialchars(text.substring(start))));
		for (var i=1; i < states.length; i++) {
			ret.push('</span>');
		}
		states.shift();
		return [ ret.join(''), states ];
	},

	htmlspecialchars: function (string) {
		return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	},
	
	htmlspecialchars_quo: function (string) {
		return jush.htmlspecialchars(string).replace(/"/g, '&quot;'); // jush - this.htmlspecialchars_quo is passed as reference
	},
	
	htmlspecialchars_apo: function (string) {
		return jush.htmlspecialchars(string).replace(/'/g, '&#39;');
	},
	
	htmlspecialchars_quo_apo: function (string) {
		return jush.htmlspecialchars_quo(string).replace(/'/g, '&#39;');
	},
	
	html_entity_decode: function (string) {
		return string.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(?:([0-9]+)|x([0-9a-f]+));/gi, function (str, p1, p2) { //! named entities
			return String.fromCharCode(p1 ? p1 : parseInt(p2, 16));
		}).replace(/&amp;/g, '&');
	},
	
	addslashes: function (string) {
		return string.replace(/\\/g, '\\$&');
	},
	
	addslashes_apo: function (string) {
		return string.replace(/[\\']/g, '\\$&');
	},
	
	addslashes_quo: function (string) {
		return string.replace(/[\\"]/g, '\\$&');
	},
	
	stripslashes: function (string) {
		return string.replace(/\\([\\"'])/g, '$1');
	}
};

jush.urls = {
	// $key stands for key in jush.links class, $val stands for found string
	tag: 'http://www.w3.org/TR/html4/$key.html#edef-$val',
	tag_css: 'http://www.w3.org/TR/html4/$key.html#edef-$val',
	tag_js: 'http://www.w3.org/TR/html4/$key.html#edef-$val',
	att: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
	att_css: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
	att_js: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
	att_http: 'http://www.w3.org/TR/html4/$key.html#adef-$val',
	css_val: 'http://www.w3.org/TR/CSS21/$key.html#propdef-$val',
	css_at: 'http://www.w3.org/TR/CSS21/$key',
	js_write: 'http://developer.mozilla.org/En/docs/DOM/$key.$val',
	php_new: 'http://www.php.net/$key.$val',
	php_sql: 'http://www.php.net/$key.$val',
	php_sqlite: 'http://www.php.net/$key.$val',
	php_pgsql: 'http://www.php.net/$key.$val',
	php_echo: 'http://www.php.net/$key.$val',
	php_phpini: 'http://www.php.net/$key.$val',
	php_http: 'http://www.php.net/$key.$val',
	php_halt: 'http://www.php.net/$key.halt-compiler',
	sql_sqlset: 'http://dev.mysql.com/doc/mysql/en/$key',
	cnf_php: 'http://www.php.net/$key',
	cnf_phpini: 'http://www.php.net/configuration.changes#$key',
	
	// [0] is base, other elements correspond to () in jush.links2, $key stands for text of selected element, $1 stands for found string
	php: [ 'http://www.php.net/$key',
		'function.$1', 'control-structures.alternative-syntax', 'control-structures.$1', 'control-structures.do.while', 'control-structures.foreach', 'control-structures.switch', 'language.functions#functions.user-defined', 'language.oop', 'language.constants.predefined', 'language.exceptions', 'language.oop5.$1', 'language.oop5.basic#language.oop5.basic.$1', 'language.oop5.cloning', 'language.oop5.constants', 'language.oop5.interfaces', 'language.oop5.visibility', 'language.operators.logical', 'language.variables.scope#language.variables.scope.$1', 'language.namespaces',
		'function.$1',
		'function.socket-get-option', 'function.socket-set-option'
	],
	phpini: [ 'http://www.php.net/$key',
		'ini.sect.safe-mode#ini.$1', 'ini.core#ini.$1', 'apache.configuration#ini.$1', 'apc.configuration#ini.$1', 'apd.configuration#ini.$1', 'bc.configuration#ini.$1', 'com.configuration#ini.$1', 'datetime.configuration#ini.$1', 'dbx.configuration#ini.$1', 'errorfunc.configuration#ini.$1', 'exif.configuration#ini.$1', 'expect.configuration#ini.$1', 'filesystem.configuration#ini.$1', 'ibase.configuration#ini.$1', 'ibm-db2.configuration#ini.$1', 'ifx.configuration#ini.$1', 'image.configuration#ini.image.jpeg-ignore-warning', 'info.configuration#ini.$1', 'mail.configuration#ini.$1', 'mail.configuration#ini.smtp', 'maxdb.configuration#ini.$1', 'mbstring.configuration#ini.$1', 'mime-magic.configuration#ini.$1', 'misc.configuration#ini.$1', 'misc.configuration#ini.syntax-highlighting', 'msql.configuration#ini.$1', 'mysql.configuration#ini.$1', 'mysqli.configuration#ini.$1', 'network.configuration#ini.$1', 'nsapi.configuration#ini.$1', 'oci8.configuration#ini.$1', 'outcontrol.configuration#ini.$1', 'pcre.configuration#ini.$1', 'pdo-odbc.configuration#ini.$1', 'pgsql.configuration#ini.$1', 'runkit.configuration#ini.$1', 'session.configuration#ini.$1', 'soap.configuration#ini.$1', 'sqlite.configuration#ini.$1', 'sybase.configuration#ini.$1', 'tidy.configuration#ini.$1', 'unicode.configuration#ini.$1', 'odbc.configuration#ini.$1', 'zlib.configuration#ini.$1'
	],
	php_doc: [ 'http://manual.phpdoc.org/HTMLframesConverter/default/phpDocumentor/tutorial_tags.$key.pkg.html',
		'$1', 'internal$1'
	],
	http: [ 'http://www.w3.org/Protocols/rfc2616/rfc2616-$key',
		'sec10.html#sec10.1.1', 'sec10.html#sec10.1.2', 'sec10.html#sec10.2.1', 'sec10.html#sec10.2.2', 'sec10.html#sec10.2.3', 'sec10.html#sec10.2.4', 'sec10.html#sec10.2.5', 'sec10.html#sec10.2.6', 'sec10.html#sec10.2.7', 'sec10.html#sec10.3.1', 'sec10.html#sec10.3.2', 'sec10.html#sec10.3.3', 'sec10.html#sec10.3.4', 'sec10.html#sec10.3.5', 'sec10.html#sec10.3.6', 'sec10.html#sec10.3.7', 'sec10.html#sec10.3.8', 'sec10.html#sec10.4.1', 'sec10.html#sec10.4.2', 'sec10.html#sec10.4.3', 'sec10.html#sec10.4.4', 'sec10.html#sec10.4.5', 'sec10.html#sec10.4.6', 'sec10.html#sec10.4.7', 'sec10.html#sec10.4.8', 'sec10.html#sec10.4.9', 'sec10.html#sec10.4.10', 'sec10.html#sec10.4.11', 'sec10.html#sec10.4.12', 'sec10.html#sec10.4.13', 'sec10.html#sec10.4.14', 'sec10.html#sec10.4.15', 'sec10.html#sec10.4.16', 'sec10.html#sec10.4.17', 'sec10.html#sec10.4.18', 'sec10.html#sec10.5.1', 'sec10.html#sec10.5.2', 'sec10.html#sec10.5.3', 'sec10.html#sec10.5.4', 'sec10.html#sec10.5.5', 'sec10.html#sec10.5.6',
		'sec14.html#sec14.1', 'sec14.html#sec14.2', 'sec14.html#sec14.3', 'sec14.html#sec14.4', 'sec14.html#sec14.5', 'sec14.html#sec14.6', 'sec14.html#sec14.7', 'sec14.html#sec14.8', 'sec14.html#sec14.9', 'sec14.html#sec14.10', 'sec14.html#sec14.11', 'sec14.html#sec14.12', 'sec14.html#sec14.13', 'sec14.html#sec14.14', 'sec14.html#sec14.15', 'sec14.html#sec14.16', 'sec14.html#sec14.17', 'sec14.html#sec14.18', 'sec14.html#sec14.19', 'sec14.html#sec14.20', 'sec14.html#sec14.21', 'sec14.html#sec14.22', 'sec14.html#sec14.23', 'sec14.html#sec14.24', 'sec14.html#sec14.25', 'sec14.html#sec14.26', 'sec14.html#sec14.27', 'sec14.html#sec14.28', 'sec14.html#sec14.29', 'sec14.html#sec14.30', 'sec14.html#sec14.31', 'sec14.html#sec14.32', 'sec14.html#sec14.33', 'sec14.html#sec14.34', 'sec14.html#sec14.35', 'sec14.html#sec14.36', 'sec14.html#sec14.37', 'sec14.html#sec14.38', 'sec14.html#sec14.39', 'sec14.html#sec14.40', 'sec14.html#sec14.41', 'sec14.html#sec14.42', 'sec14.html#sec14.43', 'sec14.html#sec14.44', 'sec14.html#sec14.45', 'sec14.html#sec14.46', 'sec14.html#sec14.47',
		'http://www.ietf.org/rfc/rfc2109.txt', 'http://en.wikipedia.org/wiki/$1', 'http://msdn.microsoft.com/en-us/library/cc288472.aspx#_replace'
	],
	sql: [ 'http://dev.mysql.com/doc/mysql/en/$key',
		'alter-event.html', 'alter-table.html', 'alter-view.html', 'analyze-table.html', 'create-event.html', 'create-function.html', 'create-procedure.html', 'create-index.html', 'create-table.html', 'create-trigger.html', 'create-view.html', 'drop-index.html', 'drop-table.html', 'optimize-table.html', 'repair-table.html', 'set-transaction.html', 'show-columns.html', 'show-engines.html', 'show-index.html', 'show-processlist.html', 'show-status.html', 'show-tables.html', 'show-variables.html',
		'$1.html', 'commit.html', 'savepoints.html', 'lock-tables.html', 'fulltext-search.html',
		'comparison-operators.html#operator_$1', 'comparison-operators.html#function_$1', 'any-in-some-subqueries.html', 'all-subqueries.html', 'exists-and-not-exists-subqueries.html', 'group-by-modifiers.html', 'string-functions.html#operator_$1', 'string-comparison-functions.html#operator_$1', 'regexp.html#operator_$1', 'regexp.html#operator_regexp', 'logical-operators.html#operator_$1', 'control-flow-functions.html#operator_$1', 'arithmetic-functions.html#operator_$1', 'cast-functions.html#operator_$1', 'date-and-time-functions.html#function_$1', 'date-and-time-functions.html#function_date-add',
		'', // keywords without link
		'numeric-type-overview.html', 'date-and-time-type-overview.html', 'string-type-overview.html',
		'comparison-operators.html#function_$1', 'control-flow-functions.html#function_$1', 'string-functions.html#function_$1', 'string-comparison-functions.html#function_$1', 'mathematical-functions.html#function_$1', 'date-and-time-functions.html#function_$1', 'cast-functions.html#function_$1', 'xml-functions.html#function_$1', 'bit-functions.html#function_$1', 'encryption-functions.html#function_$1', 'information-functions.html#function_$1', 'miscellaneous-functions.html#function_$1', 'group-by-functions.html#function_$1',
		'row-subqueries.html',
		'fulltext-search.html#$1'
	],
	sqlset: [ 'http://dev.mysql.com/doc/mysql/en/$key',
		'innodb-parameters.html#sysvar_$1',
		'mysql-cluster-program-options-mysqld.html#option_mysqld_$1', 'mysql-cluster-replication-conflict-resolution.html#option_mysqld_$1', 'mysql-cluster-replication-schema.html', 'mysql-cluster-replication-starting.html', 'mysql-cluster-system-variables.html#sysvar_$1',
		'replication-options-binary-log.html#option_mysqld_$1', 'replication-options-binary-log.html#sysvar_$1', 'replication-options-master.html#sysvar_$1', 'replication-options-slave.html#option_mysqld_log-slave-updates', 'replication-options-slave.html#option_mysqld_$1', 'replication-options-slave.html#sysvar_$1', 'replication-options.html#option_mysqld_$1',
		'server-options.html#option_mysqld_big-tables', 'server-options.html#option_mysqld_$1',
		'server-session-variables.html#sysvar_$1',
		'server-system-variables.html#sysvar_low_priority_updates', 'server-system-variables.html#sysvar_max_join_size', 'server-system-variables.html#sysvar_$1',
		'ssl-options.html#option_general_$1'
	],
	sqlstatus: [ 'http://dev.mysql.com/doc/mysql/en/$key',
		'server-status-variables.html#statvar_Com_xxx',
		'server-status-variables.html#statvar_$1'
	],
	sqlite: [ 'http://www.sqlite.org/$key',
		'lang_$1.html', 'pragma.html', 'lang_createvtab.html', 'lang_transaction.html',
		'lang_createindex.html', 'lang_createtable.html', 'lang_createtrigger.html', 'lang_createview.html', 'lang_expr.html#$1',
		'lang_expr.html#corefunctions', 'cvstrac/wiki?p=DateAndTimeFunctions#$1', 'lang_expr.html#aggregatefunctions'
	],
	pgsql: [ 'http://www.postgresql.org/docs/8.2/static/$key',
		'sql-$1.html', 'sql-$1.html', 'sql-alteropclass.html', 'sql-createopclass.html', 'sql-dropopclass.html',
		'functions-datetime.html', 'functions-info.html', 'functions-logical.html', 'functions-comparison.html', 'functions-matching.html', 'functions-conditional.html', 'functions-subquery.html',
		'functions-math.html', 'functions-string.html', 'functions-binarystring.html', 'functions-formatting.html', 'functions-datetime.html', 'functions-geometry.html', 'functions-net.html', 'functions-sequence.html', 'functions-array.html', 'functions-aggregate.html', 'functions-srf.html', 'functions-info.html', 'functions-admin.html'
	],
	cnf: [ 'http://httpd.apache.org/docs/2.2/mod/$key.html#$1',
		'beos', 'core', 'mod_actions', 'mod_alias', 'mod_auth_basic', 'mod_auth_digest', 'mod_authn_alias', 'mod_authn_anon', 'mod_authn_dbd', 'mod_authn_dbm', 'mod_authn_default', 'mod_authn_file', 'mod_authnz_ldap', 'mod_authz_dbm', 'mod_authz_default', 'mod_authz_groupfile', 'mod_authz_host', 'mod_authz_owner', 'mod_authz_user', 'mod_autoindex', 'mod_cache', 'mod_cern_meta', 'mod_cgi', 'mod_cgid', 'mod_dav', 'mod_dav_fs', 'mod_dav_lock', 'mod_dbd', 'mod_deflate', 'mod_dir', 'mod_disk_cache', 'mod_dumpio', 'mod_echo', 'mod_env', 'mod_example', 'mod_expires', 'mod_ext_filter', 'mod_file_cache', 'mod_filter', 'mod_headers', 'mod_charset_lite', 'mod_ident', 'mod_imagemap', 'mod_include', 'mod_info', 'mod_isapi', 'mod_ldap', 'mod_log_config', 'mod_log_forensic', 'mod_mem_cache', 'mod_mime', 'mod_mime_magic', 'mod_negotiation', 'mod_nw_ssl', 'mod_proxy', 'mod_rewrite', 'mod_setenvif', 'mod_so', 'mod_speling', 'mod_ssl', 'mod_status', 'mod_substitute', 'mod_suexec', 'mod_userdir', 'mod_usertrack', 'mod_version', 'mod_vhost_alias', 'mpm_common', 'mpm_netware', 'mpm_winnt', 'prefork'
	],
	js: [ 'http://developer.mozilla.org/En/$key',
		'Core_JavaScript_1.5_Reference/Global_Objects/$1',
		'Core_JavaScript_1.5_Reference/Global_Properties/$1',
		'Core_JavaScript_1.5_Reference/Global_Functions/$1',
		'Core_JavaScript_1.5_Reference/Statements/$1',
		'Core_JavaScript_1.5_Reference/Statements/do...while',
		'Core_JavaScript_1.5_Reference/Statements/if...else',
		'Core_JavaScript_1.5_Reference/Statements/try...catch',
		'Core_JavaScript_1.5_Reference/Operators/Special_Operators/$1_Operator',
		'DOM/document.$1', 'DOM/element.$1', 'DOM/event.$1', 'DOM/form.$1', 'DOM/table.$1', 'DOM/window.$1',
		'Core_JavaScript_1.5_Reference/Global_Objects/Array/$1',
		'Core_JavaScript_1.5_Reference/Global_Objects/Date/$1',
		'Core_JavaScript_1.5_Reference/Global_Objects/Function/$1',
		'Core_JavaScript_1.5_Reference/Global_Objects/Number/$1',
		'Core_JavaScript_1.5_Reference/Global_Objects/RegExp/$1',
		'Core_JavaScript_1.5_Reference/Global_Objects/String/$1'
	]
};

jush.links = {
	tag: {
		'interact/forms': /^(button|fieldset|form|input|isindex|label|legend|optgroup|option|select|textarea)$/i,
		'interact/scripts': /^(noscript)$/i,
		'present/frames': /^(frame|frameset|iframe|noframes)$/i,
		'present/graphics': /^(b|basefont|big|center|font|hr|i|s|small|strike|tt|u)$/i,
		'struct/dirlang': /^(bdo)$/i,
		'struct/global': /^(address|body|div|h1|h2|h3|h4|h5|h6|head|html|meta|span|title)$/i,
		'struct/links': /^(a|base|link)$/i,
		'struct/lists': /^(dd|dir|dl|dt|li|menu|ol|ul)$/i,
		'struct/objects': /^(applet|area|img|map|object|param)$/i,
		'struct/tables': /^(caption|col|colgroup|table|tbody|td|tfoot|th|thead|tr)$/i,
		'struct/text': /^(abbr|acronym|blockquote|br|cite|code|del|dfn|em|ins|kbd|p|pre|q|samp|strong|sub|sup|var)$/i
	},
	tag_css: { 'present/styles': /^(style)$/i },
	tag_js: { 'interact/scripts': /^(script)$/i },
	att_css: { 'present/styles': /^(style)$/i },
	att_js: { 'interact/scripts': /^(onblur|onchange|onclick|ondblclick|onfocus|onkeydown|onkeypress|onkeyup|onload|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|onreset|onselect|onsubmit|onunload|onunload)$/i },
	att_http: { 'struct/global': /^(http-equiv)$/i },
	att: {
		'interact/forms': /^(accept-charset|accept|accesskey|action|align-LEGEND|checked|cols-TEXTAREA|disabled|enctype|for|label-OPTION|label-OPTGROUP|maxlength|method|multiple|name-BUTTON|name-SELECT|name-FORM|name-INPUT|prompt|readonly|rows-TEXTAREA|selected|size-INPUT|size-SELECT|src|tabindex|type-INPUT|type-BUTTON|value-INPUT|value-OPTION|value-BUTTON)$/i,
		'interact/scripts': /^(defer|language|src-SCRIPT|type-SCRIPT)$/i,
		'present/frames': /^(cols-FRAMESET|frameborder|height-IFRAME|longdesc-FRAME|marginheight|marginwidth|name-FRAME|noresize|rows-FRAMESET|scrolling|src-FRAME|target|width-IFRAME)$/i,
		'present/graphics': /^(align-HR|align|bgcolor|clear|color-FONT|face-FONT|noshade|size-HR|size-FONT|size-BASEFONT|width-HR)$/i,
		'present/styles': /^(media|type-STYLE)$/i,
		'struct/dirlang': /^(dir|dir-BDO|lang)$/i,
		'struct/global': /^(alink|background|class|content|id|link|name-META|profile|scheme|text|title|version|vlink)$/i,
		'struct/links': /^(charset|href|href-BASE|hreflang|name-A|rel|rev|type-A)$/i,
		'struct/lists': /^(compact|start|type-LI|type-OL|type-UL|value-LI)$/i,
		'struct/objects': /^(align-IMG|alt|archive-APPLET|archive-OBJECT|border-IMG|classid|code|codebase-OBJECT|codebase-APPLET|codetype|coords|data|declare|height-IMG|height-APPLET|hspace|ismap|longdesc-IMG|name-APPLET|name-IMG|name-MAP|name-PARAM|nohref|object|shape|src-IMG|standby|type-OBJECT|type-PARAM|usemap|value-PARAM|valuetype|vspace|width-IMG|width-APPLET)$/i,
		'struct/tables': /^(abbr|align-CAPTION|align-TABLE|align-TD|axis|border-TABLE|cellpadding|cellspacing|char|charoff|colspan|frame|headers|height-TH|nowrap|rowspan|rules|scope|span-COL|span-COLGROUP|summary|valign|width-TABLE|width-TH|width-COL|width-COLGROUP)$/i,
		'struct/text': /^(cite-Q|cite-INS|datetime|width-PRE)$/i
	},
	css_val: {
		'aural': /^(azimuth|cue-after|cue-before|cue|elevation|pause-after|pause-before|pause|pitch-range|pitch|play-during|richness|speak-header|speak-numeral|speak-punctuation|speak|speech-rate|stress|voice-family|volume)$/i,
		'box': /^(border(?:-top|-right|-bottom|-left)?(?:-color|-style|-width)?|margin(?:-top|-right|-bottom|-left)?|padding(?:-top|-right|-bottom|-left)?)$/i,
		'colors': /^(background-attachment|background-color|background-image|background-position|background-repeat|background|color)$/i,
		'fonts': /^(font-family|font-size|font-style|font-variant|font-weight|font)$/i,
		'generate': /^(content|counter-increment|counter-reset|list-style-image|list-style-position|list-style-type|list-style|quotes)$/i,
		'page': /^(orphans|page-break-after|page-break-before|page-break-inside|widows)$/i,
		'tables': /^(border-collapse|border-spacing|caption-side|empty-cells|table-layout)$/i,
		'text': /^(letter-spacing|text-align|text-decoration|text-indent|text-transform|white-space|word-spacing)$/i,
		'ui': /^(cursor|outline-color|outline-style|outline-width|outline)$/i,
		'visudet': /^(height|line-height|max-height|max-width|min-height|min-width|vertical-align|width)$/i,
		'visufx': /^(clip|overflow|visibility)$/i,
		'visuren': /^(bottom|clear|direction|display|float|left|position|right|top|unicode-bidi|z-index)$/i
	},
	css_at: {
		'page.html#page-box': /^page$/i,
		'media.html#at-media-rule': /^media$/i,
		'cascade.html#at-import': /^import$/i
	},
	js_write: { 'document': /^(write|writeln)$/ },
	php_new: { 'language.oop5.basic#language.oop5.basic': /^new$/i },
	php_sql: { 'function': new RegExp('^' + jush.sql_function + '$', 'i') },
	php_sqlite: { 'function': new RegExp('^' + jush.sqlite_function + '$', 'i') },
	php_pgsql: { 'function': new RegExp('^' + jush.pgsql_function + '$', 'i') },
	php_phpini: { 'function': /^(ini_get|ini_set)$/i },
	php_http: { 'function': /^(header)$/i },
	php_echo: { 'function': /^(echo|print)$/i },
	php_halt: { 'function': /^__halt_compiler$/i },
	sql_sqlset: { 'set-option.html': /.+/ },
	cnf_php: { 'configuration.file': /.+/ },
	cnf_phpini: { 'configuration.changes.apache': /.+/ }
};

// last () is used as delimiter
jush.links2 = {
	php: /\b((?:exit|die|return|(?:include|require)(?:_once)?|(end(?:for|foreach|if|switch|while|declare))|(break|continue|declare|else|elseif|for|foreach|if|switch|while|goto)|(do)|(as)|(case|default)|(function)|(var)|(__(?:CLASS|FILE|FUNCTION|LINE|METHOD|DIR|NAMESPACE)__)|(catch|throw|try)|(abstract|final)|(class|extends)|(clone)|(const)|(implements|interface)|(private|protected|public)|(and|x?or)|(global|static)|(namespace|use))\b|((?:a(?:cosh?|ddc?slashes|ggregat(?:e(?:_(?:methods(?:_by_(?:list|regexp))?|properties(?:_by_(?:list|regexp))?|info))?|ion_info)|p(?:ache_(?:get(?:_(?:modules|version)|env)|re(?:s(?:et_timeout|ponse_headers)|quest_headers)|(?:child_termina|no)te|lookup_uri|setenv)|d_(?:c(?:(?:allstac|lun|roa)k|ontinue)|dump_(?:function_table|(?:persistent|regular)_resources)|set_(?:s(?:ession(?:_trace)?|ocket_session_trace)|pprof_trace)|breakpoint|echo|get_active_symbols))|r(?:ray(?:_(?:c(?:h(?:ange_key_case|unk)|o(?:mbine|unt_values))|diff(?:_(?:u(?:assoc|key)|assoc|key))?|f(?:il(?:l|ter)|lip)|intersect(?:_(?:u(?:assoc|key)|assoc|key))?|key(?:_exist)?s|m(?:erge(?:_recursive)?|ap|ultisort)|p(?:ad|op|ush)|r(?:e(?:duc|vers)e|and)|s(?:earch|hift|p?lice|um)|u(?:diff(?:_u?assoc)?|intersect(?:_u?assoc)?|n(?:ique|shift))|walk(?:_recursive)?|values))?|sort)|s(?:inh?|pell_(?:check(?:_raw)?|new|suggest)|sert(?:_options)?|cii2ebcdic|ort)|tan[2h]?|bs)|b(?:ase(?:64_(?:de|en)code|_convert|name)|c(?:m(?:od|ul)|ompiler_(?:write_(?:f(?:unction(?:s_from_file)?|ile|ooter)|c(?:lass|onstant)|(?:exe_foot|head)er)|load(?:_exe)?|parse_class|read)|pow(?:mod)?|s(?:cale|qrt|ub)|add|comp|div)|in(?:d(?:_textdomain_codeset|ec|textdomain)|2hex)|z(?:c(?:lose|ompress)|err(?:no|(?:o|st)r)|decompress|flush|open|read|write))|c(?:al(?:_(?:days_in_month|(?:from|to)_jd|info)|l_user_(?:func(?:_array)?|method(?:_array)?))|cvs_(?:a(?:dd|uth)|co(?:mmand|unt)|d(?:elet|on)e|re(?:port|turn|verse)|s(?:ale|tatus)|init|lookup|new|textvalue|void)|h(?:eckd(?:ate|nsrr)|o(?:p|wn)|r(?:oot)?|dir|grp|mod|unk_split)|l(?:ass(?:_(?:exis|(?:implem|par)en)ts|kit_(?:method_(?:re(?:defin|mov|nam)e|add|copy)|import))|ose(?:dir|log)|earstatcache)|o(?:m(?:_(?:get(?:_active_object)?|i(?:nvoke|senum)|load(?:_typelib)?|pr(?:op(?:[gs]e|pu)t|int_typeinfo)|addref|create_guid|event_sink|message_pump|release|set)|pact)?|n(?:nection_(?:aborted|status|timeout)|vert_(?:uu(?:de|en)code|cyr_string)|stant)|sh?|unt(?:_chars)?|py)|pdf_(?:a(?:dd_(?:annotation|outline)|rc)|c(?:l(?:ose(?:path(?:_(?:fill_)?stroke)?)?|ip)|ircle|ontinue_text|urveto)|fi(?:ll(?:_stroke)?|nalize(?:_page)?)|o(?:pen|utput_buffer)|p(?:age_init|lace_inline_image)|r(?:e(?:ct|store)|otate(?:_text)?|(?:lin|mov)eto)|s(?:ave(?:_to_file)?|et(?:_(?:c(?:har_spacing|reator|urrent_page)|font(?:_(?:directories|map_file))?|t(?:ext_(?:r(?:endering|ise)|matrix|pos)|itle)|action_url|(?:horiz_scal|lead|word_spac)ing|(?:keyword|viewer_preference)s|page_animation|subject)|gray(?:_(?:fill|stroke))?|line(?:cap|join|width)|rgbcolor(?:_(?:fill|stroke))?|dash|(?:fla|miterlimi)t)|how(?:_xy)?|tr(?:ingwidth|oke)|cale)|t(?:ext|ranslate)|(?:begin|end)_text|global_set_document_limits|import_jpeg|(?:lin|mov)eto|newpath)|r(?:ack_(?:c(?:heck|losedict)|getlastmessage|opendict)|c32|eate_function|ypt)|type_(?:al(?:num|pha)|p(?:rin|unc)t|cntrl|x?digit|graph|(?:low|upp)er|space)|ur(?:l_(?:c(?:los|opy_handl)e|e(?:rr(?:no|or)|xec)|multi_(?:in(?:fo_read|it)|(?:(?:add|remove)_handl|clos)e|exec|(?:getconten|selec)t)|getinfo|(?:ini|setop)t|version)|rent)|y(?:bercash_(?:base64_(?:de|en)code|(?:de|en)cr)|rus_(?:c(?:lose|onnect)|authenticate|(?:un)?bind|query))|eil)|d(?:ate(?:_sun(?:rise|set))?|b(?:a(?:_(?:f(?:etch|irstkey)|op(?:en|timize)|(?:clos|delet|replac)e|(?:exist|handler)s|(?:inser|key_spli|lis)t|nextkey|popen|sync)|se_(?:c(?:los|reat)e|get_(?:record(?:_with_names)?|header_info)|num(?:fiel|recor)ds|(?:add|(?:delet|replac)e)_record|open|pack))|m(?:f(?:etch|irstkey)|(?:clos|delet|replac)e|exists|insert|nextkey|open)|plus_(?:a(?:dd|ql)|c(?:(?:hdi|ur)r|lose)|err(?:code|no)|f(?:i(?:nd|rst)|ree(?:(?:all|r)locks|lock)|lush)|get(?:lock|unique)|l(?:ast|ockrel)|r(?:c(?:r(?:t(?:exact|like)|eate)|hperm)|es(?:olve|torepos)|keys|open|query|rename|secindex|unlink|zap)|s(?:etindex(?:bynumber)?|avepos|ql)|t(?:cl|remove)|u(?:n(?:do(?:prepare)?|lockrel|select)|pdate)|x(?:un)?lockrel|info|next|open|prev)|x_(?:c(?:o(?:mpare|nnect)|lose)|e(?:rror|scape_string)|fetch_row|query|sort)|list)|cn?gettext|e(?:bug(?:_(?:(?:print_)?backtrace|zval_dump)|ger_o(?:ff|n))|c(?:bin|hex|oct)|fine(?:_syslog_variables|d)?|aggregate|g2rad)|i(?:o_(?:s(?:eek|tat)|t(?:csetattr|runcate)|(?:clos|writ)e|fcntl|open|read)|r(?:name)?|sk(?:_(?:free|total)_space|freespace))|n(?:s_(?:get_(?:mx|record)|check_record)|gettext)|o(?:m(?:xml_(?:open_(?:file|mem)|x(?:slt_stylesheet(?:_(?:doc|file))?|mltree)|new_doc|version)|_import_simplexml)|tnet(?:_load)?|ubleval)|gettext|l)|e(?:a(?:ster_da(?:te|ys)|ch)|r(?:eg(?:i(?:_replace)?|_replace)?|ror_(?:lo|reportin)g)|scapeshell(?:arg|cmd)|x(?:if_(?:t(?:agname|humbnail)|imagetype|read_data)|p(?:lode|m1)?|t(?:ension_loaded|ract)|ec)|bcdic2ascii|mpty|nd|val|zmlm_hash)|f(?:am_(?:c(?:ancel_monitor|lose)|monitor_(?:collection|directory|file)|next_event|open|pending|(?:resume|suspend)_monitor)|bsql_(?:a(?:ffected_rows|utocommit)|c(?:lo(?:b_siz|s)e|o(?:mmi|nnec)t|reate_(?:[bc]lo|d)b|hange_user)|d(?:ata(?:base(?:_password)?|_seek)|b_(?:query|status)|rop_db)|err(?:no|or)|f(?:etch_(?:a(?:rray|ssoc)|field|lengths|object|row)|ield_(?:t(?:abl|yp)e|flags|len|name|seek)|ree_result)|list_(?:db|field|table)s|n(?:um_(?:field|row)s|ext_result)|p(?:assword|connect)|r(?:e(?:ad_[bc]lob|sult)|ollback)|s(?:e(?:t_(?:lob_mode|password|transaction)|lect_db)|t(?:art|op)_db)|(?:blob_siz|(?:host|table|user)nam)e|get_autostart_info|insert_id|query|warnings)|df_(?:add_(?:doc_javascript|template)|c(?:los|reat)e|e(?:rr(?:no|or)|num_values)|get_(?:a(?:p|ttachment)|f(?:ile|lags)|v(?:alue|ersion)|encoding|opt|status)|open(?:_string)?|s(?:ave(?:_string)?|et_(?:f(?:ile|lags)|o(?:n_import_javascri)?pt|s(?:tatus|ubmit_form_action)|v(?:alue|ersion)|ap|encoding|javascript_action|target_frame))|header|next_field_name|remove_item)|get(?:c(?:sv)?|ss?)|ile(?:_(?:exis|(?:ge|pu)t_conten)ts|p(?:ro(?:_(?:field(?:count|(?:nam|typ)e|width)|r(?:etrieve|owcount)))?|erms)|(?:[acm]tim|inod|siz|typ)e|group|owner)?|l(?:o(?:atval|ck|or)|ush)|p(?:ut(?:csv|s)|assthru|rintf)|r(?:e(?:a|nchtoj)d|ibidi_log2vis)|s(?:canf|eek|ockopen|tat)|t(?:p_(?:c(?:h(?:dir|mod)|dup|lose|onnect)|f(?:ge|pu)t|get(?:_option)?|m(?:dtm|kdir)|n(?:b_(?:f(?:ge|pu)t|continue|(?:ge|pu)t)|list)|p(?:asv|ut|wd)|r(?:aw(?:list)?|ename|mdir)|s(?:i[tz]e|et_option|sl_connect|ystype)|(?:allo|exe)c|delete|login|quit)|ell|ok|runcate)|unc(?:_(?:get_args?|num_args)|tion_exists)|(?:clos|writ)e|eof|(?:flus|nmatc)h|mod|open)|g(?:et(?:_(?:c(?:lass(?:_(?:method|var)s)?|(?:fg_va|urrent_use)r)|de(?:clared_(?:class|interfac)es|fined_(?:constant|function|var)s)|h(?:eaders|tml_translation_table)|include(?:_path|d_files)|m(?:agic_quotes_(?:gpc|runtime)|eta_tags)|re(?:quired_files|source_type)|browser|(?:extension_func|loaded_extension|object_var|parent_clas)s)|hostby(?:namel?|addr)|m(?:y(?:[gpu]id|inode)|xrr)|protobyn(?:ame|umber)|r(?:andmax|usage)|servby(?:name|port)|t(?:ext|imeofday|ype)|allheaders|(?:cw|lastmo)d|(?:dat|imagesiz)e|env|opt)|m(?:p_(?:a(?:bs|[dn]d)|c(?:lrbit|mp|om)|div(?:_(?:qr?|r)|exact)?|gcd(?:ext)?|in(?:(?:i|ver)t|tval)|m(?:od|ul)|p(?:o(?:wm?|pcount)|(?:erfect_squar|rob_prim)e)|s(?:can[01]|qrt(?:rem)?|etbit|ign|trval|ub)|(?:fac|hamdis)t|jacobi|legendre|neg|x?or|random)|(?:dat|(?:mk|strf)tim)e)|z(?:c(?:lose|ompress)|e(?:ncode|of)|get(?:ss?|c)|p(?:assthru|uts)|re(?:a|win)d|(?:(?:(?:de|in)fla|wri)t|fil)e|open|seek|tell|uncompress)|d_info|lob|regoriantojd)|h(?:e(?:ader(?:s_(?:lis|sen)t)?|brevc?|xdec)|ighlight_(?:file|string)|t(?:ml(?:_entity_decode|(?:entitie|specialchar)s)|tp_build_query)|w(?:_(?:a(?:pi_(?:attribute|(?:conten|objec)t)|rray2objrec)|c(?:h(?:ildren(?:obj)?|angeobject)|onnect(?:ion_info)?|lose|p)|d(?:oc(?:byanchor(?:obj)?|ument_(?:s(?:etcontent|ize)|attributes|bodytag|content))|eleteobject|ummy)|e(?:rror(?:msg)?|dittext)|get(?:an(?:chors(?:obj)?|dlock)|child(?:coll(?:obj)?|doccoll(?:obj)?)|object(?:byquery(?:coll(?:obj)?|obj)?)?|parents(?:obj)?|re(?:mote(?:children)?|llink)|srcbydestobj|text|username)|i(?:n(?:s(?:ert(?:anchors|(?:documen|objec)t)|coll|doc)|collections|fo)|dentify)|m(?:apid|odifyobject|v)|o(?:bjrec2array|utput_document)|p(?:connec|ipedocumen)t|s(?:etlinkroo|ta)t|(?:(?:free|new)_documen|roo)t|unlock|who)|api_hgcsp)|ypot)|i(?:base_(?:a(?:dd_user|ffected_rows)|b(?:lob_(?:c(?:ancel|(?:los|reat)e)|i(?:mport|nfo)|add|echo|get|open)|ackup)|c(?:o(?:mmit(?:_ret)?|nnect)|lose)|d(?:b_info|elete_user|rop_db)|e(?:rr(?:code|msg)|xecute)|f(?:etch_(?:assoc|object|row)|ree_(?:event_handler|query|result)|ield_info)|m(?:aintain_db|odify_user)|n(?:um_(?:field|param)s|ame_result)|p(?:aram_info|connect|repare)|r(?:ollback(?:_ret)?|estore)|se(?:rv(?:ice_(?:at|de)tach|er_info)|t_event_handler)|t(?:imefmt|rans)|gen_id|query|wait_event)|conv(?:_(?:mime_(?:decode(?:_headers)?|encode)|s(?:tr(?:len|r?pos)|et_encoding|ubstr)|get_encoding))?|d(?:3_(?:get_(?:frame_(?:long|short)_name|genre_(?:id|list|name)|tag|version)|(?:remove|set)_tag)|ate)|fx(?:_(?:b(?:lobinfile_mode|yteasvarchar)|c(?:o(?:nnect|py_blob)|reate_(?:blob|char)|lose)|error(?:msg)?|f(?:ield(?:properti|typ)es|ree_(?:blob|char|result)|etch_row)|get(?:_(?:blob|char)|sqlca)|nu(?:m_(?:field|row)s|llformat)|p(?:connect|repare)|update_(?:blob|char)|affected_rows|do|htmltbl_result|query|textasvarchar)|us_(?:c(?:los|reat)e_slob|(?:(?:fre|writ)e|open|read|seek|tell)_slob))|m(?:a(?:ge(?:_type_to_(?:extension|mime_type)|a(?:lphablending|ntialias|rc)|c(?:har(?:up)?|o(?:lor(?:a(?:llocate(?:alpha)?|t)|closest(?:alpha|hwb)?|exact(?:alpha)?|resolve(?:alpha)?|s(?:et|forindex|total)|deallocate|match|transparent)|py(?:merge(?:gray)?|res(?:ampl|iz)ed)?)|reate(?:from(?:g(?:d(?:2(?:part)?)?|if)|x[bp]m|(?:jpe|(?:p|stri)n)g|wbmp)|truecolor)?)|d(?:ashedline|estroy)|f(?:il(?:l(?:ed(?:arc|(?:ellips|rectangl)e|polygon)|toborder)?|ter)|ont(?:height|width)|t(?:bbox|text))|g(?:d2?|ammacorrect|if)|i(?:nterlace|struecolor)|l(?:(?:ayereffec|oadfon)t|ine)|p(?:s(?:e(?:ncode|xtend)font|bbox|(?:(?:copy|free|load|slant)fon|tex)t)|alettecopy|ng|olygon)|r(?:ectangl|otat)e|s(?:et(?:t(?:hickness|ile)|brush|pixel|style)|tring(?:up)?|avealpha|[xy])|t(?:tf(?:bbox|text)|ruecolortopalette|ypes)|2?wbmp|ellipse|jpeg|xbm)|p_(?:a(?:lerts|ppend)|b(?:ody(?:struct)?|ase64|inary)|c(?:l(?:earflag_full|ose)|heck|reatemailbox)|delete(?:mailbox)?|e(?:rrors|xpunge)|fetch(?:_overview|body|header|structure)|get(?:_quota(?:root)?|acl|mailboxes|subscribed)|header(?:info|s)?|l(?:ist(?:s(?:can|ubscribed)|mailbox)?|ast_error|sub)|m(?:ail(?:_(?:co(?:mpose|py)|move)|boxmsginfo)?|ime_header_decode|sgno)|num_(?:msg|recent)|r(?:e(?:namemailbox|open)|fc822_(?:parse_(?:adrlist|headers)|write_address))|s(?:e(?:t(?:_quota|(?:ac|flag_ful)l)|arch)|canmailbox|ort|tatus|ubscribe)|t(?:hread|imeout)|u(?:n(?:delet|subscrib)e|tf(?:7_(?:de|en)code|8)|id)|(?:8bi|qprin)t|open|ping))|p(?:lode|ort_request_variables))|n(?:et_(?:ntop|pton)|gres_(?:c(?:o(?:mmi|nnec)t|lose)|f(?:etch_(?:array|object|row)|ield_(?:n(?:am|ullabl)e|length|precision|(?:scal|typ)e))|num_(?:field|row)s|(?:autocommi|pconnec)t|query|rollback)|i_(?:alter|get_all|restore)|t(?:erface_exists|val)|_array)|p(?:tc(?:embed|parse)|2long)|rcg_(?:i(?:gnore_(?:add|del)|(?:nvit|s_conn_aliv)e)|l(?:ist|(?:ookup_format_message|user)s)|n(?:ick(?:name_(?:un)?escape)?|ames|otice)|p(?:ar|connec)t|set_(?:current|(?:fil|on_di)e)|who(?:is)?|(?:(?:channel_m|html_enc)od|get_usernam)e|disconnect|(?:eval_ecmascript_param|register_format_message)s|(?:fetch_error_)?msg|join|kick|oper|topic)|s(?:_(?:a(?:rray)?|d(?:ir|ouble)|f(?:i(?:l|nit)e|loat)|in(?:t(?:eger)?|finite)|l(?:ink|ong)|n(?:u(?:ll|meric)|an)|re(?:a(?:dable|l)|source)|s(?:calar|oap_fault|tring|ubclass_of)|write?able|bool|(?:(?:call|execut)ab|uploaded_fi)le|object)|set)|(?:gnore_user_abor|terator_coun)t)|j(?:ava_last_exception_(?:clear|get)|d(?:to(?:j(?:ewish|ulian)|french|gregorian|unix)|dayofweek|monthname)|(?:ewish|ulian)tojd|oin|peg2wbmp)|k(?:ey|r?sort)|l(?:dap_(?:c(?:o(?:mpare|nnect|unt_entries)|lose)|d(?:elete|n2ufn)|e(?:rr(?:(?:2st|o)r|no)|xplode_dn)|f(?:irst_(?:(?:attribut|referenc)e|entry)|ree_result)|get_(?:values(?:_len)?|(?:attribut|entri)es|(?:d|optio)n)|mod(?:_(?:add|del|replace)|ify)|next_(?:(?:attribut|referenc)e|entry)|parse_re(?:ference|sult)|re(?:ad|name)|s(?:e(?:t_(?:option|rebind_proc)|arch)|asl_bind|ort|tart_tls)|8859_to_t61|(?:ad|(?:un)?bin)d|list|t61_to_8859)|i(?:nk(?:info)?|st)|o(?:cal(?:econv|time)|g(?:1[0p])?|ng2ip)|zf_(?:(?:de)?compress|optimized_for)|cg_value|evenshtein|stat|trim)|m(?:a(?:il(?:parse_(?:msg_(?:extract_part(?:_file)?|get_(?:part(?:_data)?|structure)|parse(?:_file)?|(?:creat|fre)e)|determine_best_xfer_encoding|rfc822_parse_addresses|stream_encode|uudecode_all))?|x)|b_(?:convert_(?:case|encoding|kana|variables)|de(?:code_(?:mimeheader|numericentity)|tect_(?:encoding|order))|e(?:ncode_(?:mimeheader|numericentity)|reg(?:_(?:search(?:_(?:get(?:po|reg)s|init|(?:(?:set)?po|reg)s))?|match|replace)|i(?:_replace)?)?)|http_(?:in|out)put|l(?:anguage|ist_encodings)|p(?:arse_str|referred_mime_name)|regex_(?:encoding|set_options)|s(?:tr(?:to(?:low|upp)er|cut|(?:im)?width|len|r?pos)|ubst(?:r(?:_count)?|itute_character)|end_mail|plit)|get_info|internal_encoding|output_handler)|c(?:al_(?:c(?:lose|reate_calendar)|d(?:a(?:te_(?:compare|valid)|y(?:_of_(?:week|year)|s_in_month))|elete_(?:calendar|event))|e(?:vent_(?:set_(?:c(?:ategory|lass)|recur_(?:monthly_[mw]day|(?:dai|week|year)ly|none)|alarm|description|end|start|title)|add_attribute|init)|xpunge)|fetch_(?:current_stream_)?event|list_(?:alarm|event)s|re(?:name_calendar|open)|s(?:nooze|tore_event)|append_event|(?:is_leap|week_of)_year|next_recurrence|p?open|time_valid)|rypt_(?:c(?:bc|fb|reate_iv)|e(?:nc(?:_(?:get_(?:(?:(?:algorithm|mode)s_nam|(?:block|iv|key)_siz)e|supported_key_sizes)|is_block_(?:algorithm(?:_mode)?|mode)|self_test)|rypt)|cb)|ge(?:neric(?:_(?:(?:de)?init|end))?|t_(?:(?:block|iv|key)_siz|cipher_nam)e)|list_(?:algorithm|mode)s|module_(?:get_(?:algo_(?:block|key)_size|supported_key_sizes)|is_block_(?:algorithm(?:_mode)?|mode)|close|open|self_test)|decrypt|ofb)|ve_(?:adduser(?:arg)?|c(?:h(?:eckstatus|(?:k|ng)pwd)|o(?:nnect(?:ionerror)?|mpleteauthorizations))|d(?:e(?:l(?:ete(?:response|trans|usersetup)|user)|stroy(?:conn|engine))|isableuser)|e(?:dit|nable)user|g(?:et(?:c(?:ell(?:bynum)?|ommadelimited)|user(?:arg|param)|header)|[fu]t|l)|i(?:nit(?:conn|engine|usersetup)|scommadelimited)|list(?:stat|user)s|m(?:axconntimeout|onitor)|num(?:column|row)s|p(?:reauth(?:completion)?|arsecommadelimited|ing)|re(?:turn(?:code|status)?|sponseparam)|s(?:et(?:ssl(?:_files)?|t(?:imeout|le)|blocking|dropfile|ip)|ale)|t(?:ext_(?:c(?:ode|v)|avs)|rans(?:action(?:a(?:uth|vs)|i(?:d|tem)|batch|cv|(?:ssen|tex)t)|inqueue|new|param|send))|u(?:b|wait)|v(?:erify(?:connection|sslcert)|oid)|bt|(?:forc|overrid)e|qc))|d(?:5(?:_file)?|ecrypt_generic)|e(?:m(?:cache_debug|ory_get_usage)|t(?:aphone|hod_exists))|hash(?:_(?:get_(?:block_siz|hash_nam)e|count|keygen_s2k))?|i(?:n(?:g_(?:set(?:cubicthreshold|scale)|useswfversion))?|(?:crotim|me_content_typ)e)|k(?:dir|time)|o(?:ney_format|ve_uploaded_file)|s(?:ession_(?:c(?:o(?:nnec|un)t|reate)|d(?:estroy|isconnect)|get(?:_(?:array|data))?|l(?:ist(?:var)?|ock)|set(?:_(?:array|data))?|un(?:iq|lock)|find|inc|plugin|randstr|timeout)|g_(?:re(?:ceiv|move_queu)e|s(?:e(?:nd|t_queue)|tat_queue)|get_queue)|ql(?:_(?:c(?:reate_?db|lose|onnect)|d(?:b(?:_query|name)|ata_seek|rop_db)|f(?:etch_(?:array|field|object|row)|ield(?:_(?:t(?:abl|yp)e|flags|len|name|seek)|t(?:abl|yp)e|flags|len|name)|ree_result)|list_(?:db|field|table)s|num(?:_(?:field|row)s|(?:field|row)s)|re(?:gcase|sult)|affected_rows|error|pconnect|query|select_db|tablename))?|sql_(?:c(?:lose|onnect)|f(?:etch_(?:a(?:rray|ssoc)|batch|field|object|row)|ield_(?:length|(?:nam|typ)e|seek)|ree_(?:resul|statemen)t)|g(?:et_last_message|uid_string)|min_(?:error|message)_severity|n(?:um_(?:field|row)s|ext_result)|r(?:esult|ows_affected)|bind|data_seek|execute|(?:ini|pconnec)t|query|select_db))|t_(?:getrandmax|s?rand)|uscat_(?:g(?:et|ive)|setup(?:_net)?|close)|ysql(?:_(?:c(?:l(?:ient_encoding|ose)|hange_user|onnect|reate_db)|d(?:ata_seek|b_name|rop_db)|e(?:rr(?:no|or)|scape_string)|f(?:etch_(?:a(?:rray|ssoc)|field|lengths|object|row)|ield_(?:t(?:abl|yp)e|flags|len|name|seek)|ree_result)|get_(?:(?:clien|hos)t|proto|server)_info|in(?:fo|sert_id)|list_(?:db|field|(?:process|tabl)e)s|num_(?:field|row)s|p(?:connect|ing)|re(?:al_escape_string|sult)|s(?:elect_db|tat)|t(?:ablename|hread_id)|affected_rows)|i_(?:a(?:ffected_rows|utocommit)|bind_(?:param|result)|c(?:ha(?:nge_user|racter_set_name)|l(?:ient_encoding|ose)|o(?:nnect(?:_err(?:no|or))?|mmit))|d(?:isable_r(?:eads_from_master|pl_parse)|ata_seek|ebug|ump_debug_info)|e(?:nable_r(?:eads_from_master|pl_parse)|rr(?:no|or)|mbedded_connect|scape_string|xecute)|f(?:etch(?:_(?:a(?:rray|ssoc)|field(?:_direct|s)?|lengths|object|row))?|ield_(?:count|seek|tell)|ree_result)|get_(?:client_(?:info|version)|server_(?:info|version)|(?:host|proto)_info|metadata)|in(?:fo|it|sert_id)|n(?:um_(?:field|row)s|ext_result)|p(?:aram_count|ing|repare)|r(?:e(?:al_(?:connect|escape_string)|port)|pl_p(?:arse_enabled|robe)|ollback)|s(?:e(?:rver_(?:end|init)|lect_db|nd_long_data|t_opt)|t(?:mt_(?:bind_(?:param|result)|e(?:rr(?:no|or)|xecute)|f(?:etch|ree_result)|res(?:et|ult_metadata)|s(?:end_long_data|qlstate|tore_result)|(?:affected|num)_rows|close|data_seek|(?:ini|param_coun)t)|(?:a|ore_resul)t)|qlstate|sl_set)|thread_(?:id|safe)|kill|(?:more_result|option)s|(?:use_resul|warning_coun)t)))|n(?:at(?:case)?sort|curses_(?:a(?:dd(?:ch(?:n?str)?|n?str)|ttr(?:o(?:ff|n)|set)|ssume_default_colors)|b(?:kgd(?:set)?|o(?:rder|ttom_panel)|audrate|eep)|c(?:l(?:rto(?:bot|eol)|ear)|olor_(?:conten|se)t|an_change_color|break|urs_set)|d(?:e(?:f(?:_(?:prog|shell)_mode|ine_key)|l(?:_panel|ay_output|ch|(?:etel|wi)n))|oupdate)|e(?:cho(?:char)?|rase(?:char)?|nd)|f(?:l(?:ash|ushinp)|ilter)|get(?:m(?:axyx|ouse)|ch|yx)|h(?:a(?:s_(?:i[cl]|colors|key)|lfdelay)|ide_panel|line)|i(?:n(?:it(?:_(?:colo|pai)r)?|s(?:ch|(?:del|ert)ln|s?tr)|ch)|sendwin)|k(?:ey(?:ok|pad)|illchar)|m(?:o(?:use(?:_trafo|interval|mask)|ve(?:_panel)?)|v(?:add(?:ch(?:n?str)?|n?str)|(?:cu|waddst)r|(?:del|get|in)ch|[hv]line)|eta)|n(?:ew(?:_panel|pad|win)|o(?:cbreak|echo|nl|qiflush|raw)|apms|l)|p(?:a(?:nel_(?:above|(?:bel|wind)ow)|ir_content)|(?:nout)?refresh|utp)|r(?:e(?:set(?:_(?:prog|shell)_mode|ty)|fresh|place_panel)|aw)|s(?:cr(?:_(?:dump|(?:ini|se)t|restore)|l)|lk_(?:attr(?:o(?:ff|n)|set)?|c(?:lea|olo)r|re(?:fresh|store)|(?:ini|se)t|(?:noutrefres|touc)h)|ta(?:nd(?:end|out)|rt_color)|avetty|how_panel)|t(?:erm(?:attrs|name)|imeout|op_panel|ypeahead)|u(?:nget(?:ch|mouse)|se_(?:e(?:nv|xtended_names)|default_colors)|pdate_panels)|v(?:idattr|line)|w(?:a(?:dd(?:ch|str)|ttr(?:o(?:ff|n)|set))|c(?:lear|olor_set)|mo(?:use_trafo|ve)|stand(?:end|out)|border|(?:eras|[hv]lin)e|(?:getc|(?:nout)?refres)h)|longname|qiflush)|l(?:2br|_langinfo)|otes_(?:c(?:reate_(?:db|note)|opy_db)|mark_(?:un)?read|body|drop_db|(?:find_no|nav_crea)te|header_info|list_msgs|search|unread|version)|sapi_(?:re(?:quest|sponse)_headers|virtual)|(?:(?:gett)?ex|umber_forma)t)|o(?:b_(?:end_(?:clean|flush)|g(?:et_(?:c(?:lean|ontents)|le(?:ngth|vel)|flush|status)|zhandler)|i(?:conv_handler|mplicit_flush)|clean|flush|list_handlers|start|tidyhandler)|c(?:i(?:_(?:c(?:o(?:mmi|nnec)t|ancel|lose)|e(?:rror|xecute)|f(?:etch(?:_(?:a(?:ll|rray|ssoc)|object|row))?|ield_(?:s(?:cal|iz)e|type(?:_raw)?|is_null|name|precision)|ree_statement)|lob_(?:copy|is_equal)|n(?:ew_(?:c(?:o(?:llection|nnect)|ursor)|descriptor)|um_(?:field|row)s)|p(?:a(?:rs|ssword_chang)e|connect)|r(?:esult|ollback)|s(?:e(?:rver_version|t_prefetch)|tatement_type)|(?:bind|define)_by_name|internal_debug)|c(?:o(?:l(?:l(?:a(?:ssign(?:elem)?|ppend)|(?:getele|tri)m|max|size)|umn(?:s(?:cal|iz)e|type(?:raw)?|isnull|name|precision))|mmit)|ancel|loselob)|e(?:rror|xecute)|f(?:etch(?:into|statement)?|ree(?:c(?:ollection|ursor)|desc|statement))|lo(?:go(?:ff|n)|adlob)|n(?:ew(?:c(?:ollection|ursor)|descriptor)|logon|umcols)|p(?:arse|logon)|r(?:o(?:llback|wcount)|esult)|s(?:avelob(?:file)?|e(?:rverversion|tprefetch)|tatementtype)|write(?:lobtofile|temporarylob)|(?:bind|define)byname|internaldebug)|tdec)|dbc_(?:c(?:lose(?:_all)?|o(?:lumn(?:privilege)?s|(?:mmi|nnec)t)|ursor)|d(?:ata_source|o)|e(?:rror(?:msg)?|xec(?:ute)?)|f(?:etch_(?:array|into|object|row)|ield_(?:n(?:ame|um)|(?:le|precisio)n|(?:scal|typ)e)|oreignkeys|ree_result)|n(?:um_(?:field|row)s|ext_result)|p(?:r(?:ocedure(?:column)?s|epare|imarykeys)|connect)|r(?:esult(?:_all)?|ollback)|s(?:etoption|(?:pecialcolumn|tatistic)s)|table(?:privilege)?s|autocommit|binmode|gettypeinfo|longreadlen)|pen(?:al_(?:buffer_(?:d(?:ata|estroy)|create|get|loadwav)|context_(?:c(?:reate|urrent)|destroy|process|suspend)|device_(?:close|open)|listener_[gs]et|s(?:ource_(?:p(?:ause|lay)|s(?:et|top)|create|destroy|get|rewind)|tream))|ssl_(?:csr_(?:export(?:_to_file)?|new|sign)|get_p(?:rivate|ublic)key|p(?:k(?:cs7_(?:(?:de|en)crypt|sign|verify)|ey_(?:export(?:_to_file)?|get_p(?:rivate|ublic)|new))|rivate_(?:de|en)crypt|ublic_(?:de|en)crypt)|s(?:eal|ign)|x509_(?:check(?:_private_key|purpose)|export(?:_to_file)?|(?:fre|pars)e|read)|error_string|(?:free_ke|verif)y|open)|dir|log)|r(?:a_(?:c(?:o(?:lumn(?:nam|siz|typ)e|mmit(?:o(?:ff|n))?)|lose)|e(?:rror(?:code)?|xec)|fetch(?:_into)?|logo(?:ff|n)|num(?:col|row)s|p(?:arse|logon)|bind|do|(?:getcolum|ope)n|rollback)|d)|utput_(?:add_rewrite_var|reset_rewrite_vars)|v(?:er(?:load|ride_function)|rimos_(?:c(?:o(?:mmi|nnec)t|lose|ursor)|exec(?:ute)?|f(?:etch_(?:into|row)|ield_(?:n(?:ame|um)|len|type)|ree_result)|num_(?:field|row)s|r(?:esult(?:_all)?|ollback)|longreadlen|prepare)))|p(?:a(?:rse(?:_(?:ini_file|str|url)|kit_(?:compile_(?:file|string)|func_arginfo))|ck|ssthru|thinfo)|c(?:ntl_(?:s(?:etpriority|ignal)|w(?:ait(?:pid)?|if(?:s(?:ignal|topp)ed|exited)|exitstatus|(?:stop|term)sig)|alarm|exec|fork|getpriority)|lose)|df_(?:a(?:dd_(?:l(?:aunch|ocal)link|annotation|(?:bookmar|(?:pdf|web)lin)k|(?:not|outlin)e|thumbnail)|rcn?|ttach_file)|begin_(?:pa(?:ge|ttern)|template)|c(?:l(?:ose(?:_(?:pdi(?:_page)?|image)|path(?:_(?:fill_)?stroke)?)?|ip)|on(?:ca|tinue_tex)t|ircle|urveto)|end(?:_(?:pa(?:ge|ttern)|template)|path)|fi(?:ll(?:_stroke)?|ndfont)|get_(?:font(?:(?:nam|siz)e)?|image_(?:height|width)|m(?:aj|in)orversion|p(?:di_(?:parameter|value)|arameter)|buffer|value)|m(?:akespotcolor|oveto)|open(?:_(?:image(?:_file)?|p(?:di(?:_page)?|ng)|ccitt|(?:fil|memory_imag)e|(?:gi|tif)f|jpeg))?|place_(?:im|pdi_p)age|r(?:e(?:ct|store)|otate)|s(?:et(?:_(?:border_(?:color|dash|style)|info(?:_(?:(?:auth|creat)or|keywords|subject|title))?|text_(?:r(?:endering|ise)|matrix|pos)|(?:(?:char|word)_spac|horiz_scal|lead)ing|duration|font|parameter|value)|f(?:la|on)t|gray(?:_(?:fill|stroke))?|line(?:cap|join|width)|m(?:atrix|iterlimit)|rgbcolor(?:_(?:fill|stroke))?|color|(?:poly)?dash)|how(?:_(?:boxed|xy))?|tr(?:ingwidth|oke)|(?:av|cal)e|kew)|(?:dele|transla)te|initgraphics|lineto|new)|f(?:pro_(?:process(?:_raw)?|cleanup|init|version)|sockopen)|g_(?:c(?:l(?:ient_encoding|ose)|o(?:n(?:nect(?:ion_(?:busy|reset|status))?|vert)|py_(?:from|to))|ancel_query)|d(?:bnam|elet)e|e(?:scape_(?:bytea|string)|nd_copy)|f(?:etch_(?:a(?:ll|rray|ssoc)|r(?:esult|ow)|object)|ield_(?:n(?:ame|um)|is_null|prtlen|(?:siz|typ)e)|ree_result)|get_(?:notify|pid|result)|l(?:ast_(?:error|notice|oid)|o_(?:c(?:los|reat)e|read(?:_all)?|(?:ex|im)port|open|(?:see|unlin)k|tell|write))|num_(?:field|row)s|p(?:arameter_status|(?:connec|or)t|ing|ut_line)|result_(?:s(?:eek|tatus)|error)|se(?:lect|t_client_encoding)|t(?:race|ty)|u(?:n(?:escape_bytea|trace)|pdate)|(?:affected_row|option)s|(?:hos|inser)t|meta_data|version)|hp(?:_(?:s(?:tr(?:eam_(?:c(?:a(?:n_ca)?st|lose(?:dir)?|opy_to_(?:me|strea)m)|f(?:ilter_(?:un)?register_factory|open_(?:t(?:emporary_|mp)file|from_file)|lush)|get[cs]|is(?:_persistent)?|open(?:_wrapper(?:_(?:as_file|ex))?|dir)|re(?:ad(?:dir)?|winddir)|s(?:ock_open_(?:(?:from_socke|hos)t|unix)|tat(?:_path)?|eek)|eof|(?:make_seekabl|writ)e|passthru|tell)|ip_whitespace)|api_name)|un(?:ame|register_url_stream_wrapper)|check_syntax|ini_scanned_files|logo_guid|register_url_stream_wrapper)|credits|info|version)|o(?:s(?:ix_(?:get(?:e[gu]id|g(?:r(?:gid|nam|oups)|id)|p(?:g(?:id|rp)|w(?:nam|uid)|p?id)|_last_error|(?:cw|[su]i)d|login|rlimit)|s(?:et(?:e[gu]id|(?:p?g|[su])id)|trerror)|t(?:imes|tyname)|ctermid|isatty|kill|mkfifo|uname))?|pen|w)|r(?:e(?:g_(?:match(?:_all)?|replace(?:_callback)?|grep|quote|split)|v)|int(?:er_(?:c(?:reate_(?:brush|dc|font|pen)|lose)|d(?:elete_(?:brush|dc|font|pen)|raw_(?:r(?:ectangle|oundrect)|bmp|chord|(?:elips|lin|pi)e|text))|end_(?:doc|page)|l(?:is|ogical_fontheigh)t|s(?:e(?:lect_(?:brush|font|pen)|t_option)|tart_(?:doc|page))|abort|(?:get_optio|ope)n|write)|_r|f)|oc_(?:(?:clos|nic|terminat)e|get_status|open))|spell_(?:add_to_(?:personal|session)|c(?:onfig_(?:d(?:ata|ict)_dir|r(?:epl|untogether)|(?:creat|ignor|mod)e|(?:persona|save_rep)l)|heck|lear_session)|new(?:_(?:config|personal))?|s(?:(?:ave_wordli|ugge)s|tore_replacemen)t)|i|ng2wbmp|utenv)|q(?:dom_(?:error|tree)|uote(?:d_printable_decode|meta))|r(?:a(?:n(?:d|ge)|r_(?:close|(?:entry_ge|lis)t|open)|wurl(?:de|en)code|d2deg)|e(?:a(?:d(?:lin(?:e(?:_(?:c(?:allback_(?:handler_(?:install|remove)|read_char)|lear_history|ompletion_function)|re(?:ad_histor|displa)y|(?:add|list|write)_history|info|on_new_line))?|k)|_exif_data|dir|(?:gz)?file)|lpath)|code(?:_(?:file|string))?|gister_(?:shutdown|tick)_function|name(?:_function)?|s(?:tore_(?:e(?:rror|xception)_handler|include_path)|et)|wind(?:dir)?|turn)|mdir|ound|sort|trim)|s(?:e(?:m_(?:re(?:leas|mov)e|acquire|get)|s(?:am_(?:co(?:mmi|nnec)t|di(?:agnostic|sconnect)|e(?:rrormsg|xecimm)|f(?:etch_(?:r(?:esult|ow)|array)|ield_(?:array|name)|ree_result)|se(?:ek_row|ttransaction)|(?:affected_row|num_field)s|query|rollback)|sion_(?:c(?:ache_(?:expire|limiter)|ommit)|de(?:code|stroy)|i(?:s_registere)?d|reg(?:enerate_id|ister)|s(?:et_(?:cookie_params|save_handler)|ave_path|tart)|un(?:register|set)|(?:encod|(?:module_)?nam|write_clos)e|get_cookie_params))|t(?:_(?:e(?:rror|xception)_handler|file_buffer|include_path|magic_quotes_runtime|time_limit)|(?:(?:raw)?cooki|local|typ)e)|rialize)|h(?:a1(?:_file)?|m(?:_(?:remove(?:_var)?|(?:at|de)tach|(?:ge|pu)t_var)|op_(?:(?:clos|(?:dele|wri)t|siz)e|open|read))|ell_exec|(?:ow_sourc|uffl)e)|i(?:m(?:plexml_(?:load_(?:file|string)|import_dom)|ilar_text)|nh?|zeof)|nmp(?:_(?:get_(?:quick_print|valueretrieval)|set_(?:(?:enum|oid_numeric|quick)_print|valueretrieval)|read_mib)|get(?:next)?|walk(?:oid)?|realwalk|set)|o(?:cket_(?:c(?:l(?:ear_error|ose)|reate(?:_(?:listen|pair))?|onnect)|get(?:_(?:option|status)|(?:peer|sock)name)|l(?:ast_error|isten)|re(?:cv(?:from)?|ad)|s(?:e(?:nd(?:to)?|t_(?:block(?:ing)?|nonblock|option|timeout)|lect)|hutdown|trerror)|accept|bind|write)|rt|undex)|p(?:l(?:iti?|_classes)|rintf)|q(?:l(?:ite_(?:c(?:reate_(?:aggregate|function)|hanges|lose|olumn|urrent)|e(?:rror|scape)_string|f(?:etch_(?:a(?:ll|rray)|s(?:ingle|tring)|column_types|object)|actory|ield_name)|has_(?:more|prev)|l(?:ast_(?:error|insert_rowid)|ib(?:encoding|version))|n(?:um_(?:field|row)s|ext)|p(?:open|rev)|udf_(?:de|en)code_binary|busy_timeout|open|rewind|seek)|_regcase)|rt)|s(?:h2_(?:auth_(?:p(?:assword|ubkey_file)|none)|f(?:etch_stream|ingerprint)|s(?:cp_(?:recv|send)|ftp(?:_(?:r(?:e(?:a(?:dlink|lpath)|name)|mdir)|s(?:tat|ymlink)|lstat|mkdir|unlink))?|hell)|connect|exec|methods_negotiated|tunnel)|canf)|t(?:r(?:_(?:r(?:ep(?:eat|lace)|ot13)|s(?:huffle|plit)|ireplace|pad|word_count)|c(?:(?:asec)?mp|hr|oll|spn)|eam_(?:co(?:ntext_(?:get_(?:default|options)|set_(?:option|params)|create)|py_to_stream)|filter_(?:re(?:gister|move)|(?:ap|pre)pend)|get_(?:(?:(?:conten|transpor)t|(?:filt|wrapp)er)s|line|meta_data)|s(?:e(?:t_(?:blocking|timeout|write_buffer)|lect)|ocket_(?:se(?:ndto|rver)|(?:accep|clien)t|enable_crypto|get_name|pair|recvfrom))|wrapper_(?:re(?:gister|store)|unregister)|register_wrapper)|i(?:p(?:_tag|c?slashe|o)s|str)|n(?:atc(?:asec)?mp|c(?:asec)?mp)|p(?:brk|os|time)|r(?:chr|ev|i?pos)|s(?:pn|tr)|t(?:o(?:k|(?:low|upp)er|time)|r)|ftime|len|val)|at)|ubstr(?:_(?:co(?:mpare|unt)|replace))?|wf(?:_(?:a(?:ction(?:g(?:oto(?:frame|label)|eturl)|p(?:lay|revframe)|s(?:ettarget|top)|(?:next|waitfor)frame|togglequality)|dd(?:buttonrecord|color))|define(?:bitmap|(?:fon|rec|tex)t|line|poly)|end(?:s(?:hape|ymbol)|(?:butt|doacti)on)|font(?:s(?:ize|lant)|tracking)|get(?:f(?:ontinfo|rame)|bitmapinfo)|l(?:abelframe|ookat)|m(?:odifyobject|ulcolor)|o(?:rtho2?|ncondition|penfile)|p(?:o(?:larview|pmatrix|sround)|erspective|laceobject|ushmatrix)|r(?:emoveobject|otate)|s(?:etf(?:ont|rame)|h(?:ape(?:curveto3?|fill(?:bitmap(?:clip|tile)|off|solid)|line(?:solid|to)|arc|moveto)|owframe)|tart(?:s(?:hape|ymbol)|(?:butt|doacti)on)|cale)|t(?:extwidth|ranslate)|closefile|nextid|viewport)|b(?:utton(?:_keypress)?|itmap)|f(?:ill|ont)|mo(?:rph|vie)|s(?:hap|prit)e|text(?:field)?|action|displayitem|gradient)|y(?:base_(?:c(?:lose|onnect)|d(?:ata_seek|eadlock_retry_count)|f(?:etch_(?:a(?:rray|ssoc)|field|object|row)|ield_seek|ree_result)|min_(?:client|(?:erro|serve)r|message)_severity|num_(?:field|row)s|se(?:lect_db|t_message_handler)|affected_rows|get_last_message|(?:pconnec|resul)t|(?:unbuffered_)?query)|s(?:log|tem)|mlink)|candir|leep|rand)|t(?:anh?|e(?:mpnam|xtdomain)|i(?:dy_(?:c(?:lean_repair|onfig_count)|get(?:_(?:h(?:tml(?:_ver)?|ead)|r(?:elease|oot)|body|config|error_buffer|output|status)|opt)|is_x(?:ht)?ml|parse_(?:file|string)|re(?:pair_(?:file|string)|set_config)|s(?:et(?:_encoding|opt)|ave_config)|(?:access|error|warning)_count|diagnose|load_config)|me(?:_nanosleep)?)|o(?:ken_(?:get_all|name)|uch)|ri(?:gger_error|m)|cpwrap_check|mpfile)|u(?:c(?:first|words)|dm_(?:a(?:lloc_agent(?:_array)?|dd_search_limit|pi_version)|c(?:at_(?:list|path)|heck_(?:charset|stored)|l(?:ear_search_limits|ose_stored)|rc32)|err(?:no|or)|f(?:ree_(?:agent|ispell_data|res)|ind)|get_(?:res_(?:field|param)|doc_count)|hash32|load_ispell_data|open_stored|set_agent_param)|n(?:i(?:qi|xtoj)d|se(?:rialize|t)|(?:lin|pac)k|register_tick_function)|rl(?:de|en)code|s(?:er_error|leep|ort)|tf8_(?:de|en)code|[ak]sort|mask)|v(?:ar(?:_(?:dump|export)|iant(?:_(?:a(?:bs|[dn]d)|c(?:as?t|mp)|d(?:ate_(?:from|to)_timestamp|iv)|i(?:div|mp|nt)|m(?:od|ul)|n(?:eg|ot)|s(?:et(?:_type)?|ub)|eqv|fix|get_type|x?or|pow|round))?)|p(?:opmail_(?:a(?:dd_(?:alias_domain(?:_ex)?|domain(?:_ex)?|user)|lias_(?:del(?:_domain)?|get(?:_all)?|add)|uth_user)|del_(?:domain(?:_ex)?|user)|error|passwd|set_user_quota)|rintf)|ersion_compare|[fs]printf|irtual)|w(?:32api_(?:in(?:it_dtype|voke_function)|deftype|register_function|set_call_method)|ddx_(?:packet_(?:end|start)|serialize_va(?:lue|rs)|add_vars|deserialize)|ordwrap)|x(?:attr_(?:s(?:et|upported)|(?:ge|lis)t|remove)|diff_(?:file_(?:diff(?:_binary)?|patch(?:_binary)?|merge3)|string_(?:diff(?:_binary)?|patch(?:_binary)?|merge3))|ml(?:_(?:get_(?:current_(?:byte_index|(?:column|line)_number)|error_code)|parse(?:r_(?:create(?:_ns)?|free|[gs]et_option)|_into_struct)?|set_(?:e(?:lement|nd_namespace_decl|xternal_entity_ref)_handler|(?:character_data|default|(?:notation|start_namespace|unparsed_entity)_decl|processing_instruction)_handler|object)|error_string)|rpc_(?:decode(?:_request)?|encode(?:_request)?|se(?:rver_(?:c(?:all_method|reate)|register_(?:introspection_callback|method)|add_introspection_data|destroy)|t_type)|get_type|is_fault|parse_method_descriptions))|p(?:ath_(?:eval(?:_expression)?|new_context)|tr_(?:eval|new_context))|sl(?:_xsltprocessor_(?:re(?:gister_php_functions|move_parameter)|transform_to_(?:doc|uri|xml)|[gs]et_parameter|(?:has_exslt_suppor|import_styleshee)t)|t_(?:backend_(?:info|name|version)|err(?:no|or)|set(?:_(?:e(?:ncoding|rror_handler)|s(?:ax_handlers?|cheme_handlers?)|base|log|object)|opt)|(?:creat|fre)e|getopt|process)))|y(?:az_(?:c(?:cl_(?:conf|parse)|lose|onnect)|e(?:rr(?:no|or)|(?:lemen|s_resul)t)|r(?:ange|ecord)|s(?:c(?:an(?:_result)?|hema)|e(?:arch|t_option)|ort|yntax)|addinfo|database|get_option|hits|itemorder|(?:presen|wai)t)|p_(?:err(?:_string|no)|ma(?:ster|tch)|all|(?:ca|firs|nex)t|get_default_domain|order))|z(?:end_(?:logo_guid|version)|ip_(?:entry_(?:c(?:ompress(?:edsize|ionmethod)|lose)|(?:filesiz|nam)e|open|read)|close|open|read)|lib_get_coding_type))|(socket_getopt)|(socket_setopt))(\s*(?:\(|$)))/gi, // collisions: while
	phpini: /\b(disable_classes|disable_functions|open_basedir|safe_mode_allowed_env_vars|safe_mode_exec_dir|safe_mode_gid|safe_mode_include_dir|safe_mode_protected_env_vars|safe_mode|(allow_call_time_pass_reference|always_populate_raw_post_data|arg_separator\.input|arg_separator\.output|asp_tags|auto_append_file|auto_globals_jit|auto_prepend_file|cgi\.fix_pathinfo|cgi\.force_redirect|cgi\.check_shebang_line|cgi\.redirect_status_env|cgi\.rfc2616_headers|default_charset|default_mimetype|doc_root|expose_php|extension_dir|fastcgi\.impersonate|file_uploads|include_path|memory_limit|post_max_size|precision|register_argc_argv|register_globals|register_long_arrays|short_open_tag|sql\.safe_mode|upload_max_filesize|upload_tmp_dir|user_dir|variables_order|y2k_compliance|zend\.ze1_compatibility_mode)|(engine|child_terminate|last_modified|xbithack)|(apc\.cache_by_default|apc\.enable_cli|apc\.enabled|apc\.file_update_protection|apc\.filters|apc\.gc_ttl|apc\.mmap_file_mask|apc\.num_files_hint|apc\.optimization|apc\.shm_segments|apc\.shm_size|apc\.slam_defense|apc\.ttl)|(apd\.dumpdir|apd\.statement_tracing)|(bcmath\.scale)|(com\.allow_dcom|com\.autoregister_casesensitive|com\.autoregister_typelib|com\.autoregister_verbose|com\.code_page|com\.typelib_file)|(date\.default_latitude|date\.default_longitude|date\.sunrise_zenith|date\.sunset_zenith|date\.timezone)|(dbx\.colnames_case)|(display_errors|display_startup_errors|docref_ext|docref_root|error_append_string|error_log|error_prepend_string|error_reporting|html_errors|ignore_repeated_errors|ignore_repeated_source|log_errors_max_len|log_errors|report_memleaks|track_errors)|(exif\.decode_jis_intel|exif\.decode_jis_motorola|exif\.decode_unicode_intel|exif\.decode_unicode_motorola|exif\.encode_jis|exif\.encode_unicode)|(expect\.logfile|expect\.loguser|expect\.timeout)|(allow_url_fopen|allow_url_include|auto_detect_line_endings|default_socket_timeout|from|user_agent)|(ibase\.allow_persistent|ibase\.dateformat|ibase\.default_db|ibase\.default_charset|ibase\.default_password|ibase\.default_user|ibase\.max_links|ibase\.max_persistent|ibase\.timeformat|ibase\.timestampformat)|(ibm_db2\.binmode|ibm_db2\.instance_name)|(ifx\.allow_persistent|ifx\.blobinfile|ifx\.byteasvarchar|ifx\.default_host|ifx\.default_password|ifx\.default_user|ifx\.charasvarchar|ifx\.max_links|ifx\.max_persistent|ifx\.nullformat|ifx\.textasvarchar)|(gd.jpeg_ignore_warning)|(assert\.active|assert\.bail|assert\.callback|assert\.quiet_eval|assert\.warning|enable_dl|magic_quotes_gpc|magic_quotes_runtime|max_execution_time|max_input_nesting_level|max_input_time)|(sendmail_from|sendmail_path|smtp_port)|(SMTP)|(maxdb\.default_db|maxdb\.default_host|maxdb\.default_pw|maxdb\.default_user|maxdb\.long_readlen)|(mbstring\.detect_order|mbstring\.encoding_translation|mbstring\.func_overload|mbstring\.http_input|mbstring\.http_output|mbstring\.internal_encoding|mbstring\.language|mbstring\.substitute_character)|(mime_magic\.debug|mime_magic\.magicfile)|(browscap|ignore_user_abort)|(highlight.bg|highlight.comment|highlight.default|highlight.html|highlight.keyword|highlight.string)|(msql\.allow_persistent|msql\.max_links|msql\.max_persistent)|(mysql\.allow_persistent|mysql\.connect_timeout|mysql\.default_host|mysql\.default_password|mysql\.default_port|mysql\.default_socket|mysql\.default_user|mysql\.max_links|mysql\.max_persistent|mysql\.trace_mode)|(mysqli\.default_host|mysqli\.default_port|mysqli\.default_pw|mysqli\.default_socket|mysqli\.default_user|mysqli\.max_links)|(define_syslog_variables)|(nsapi\.read_timeout)|(oci8\.default_prefetch|oci8\.max_persistent|oci8\.old_oci_close_semantics|oci8\.persistent_timeout|oci8\.ping_interval|oci8\.privileged_connect|oci8\.statement_cache_size)|(implicit_flush|output_buffering|output_handler)|(pcre\.backtrack_limit|pcre\.recursion_limit)|(pdo_odbc\.connection_pooling|pdo_odbc\.db2_instance_name)|(pgsql\.allow_persistent|pgsql\.auto_reset_persistent|pgsql\.ignore_notice|pgsql\.log_notice|pgsql\.max_links|pgsql\.max_persistent)|(runkit\.superglobal)|(session\.auto_start|session\.bug_compat_42|session\.bug_compat_warn|session\.cache_expire|session\.cache_limiter|session\.cookie_domain|session\.cookie_httponly|session\.cookie_lifetime|session\.cookie_path|session\.cookie_secure|session\.entropy_file|session\.entropy_length|session\.gc_divisor|session\.gc_maxlifetime|session\.gc_probability|session\.hash_bits_per_character|session\.hash_function|session\.name|session\.referer_check|session\.save_handler|session\.save_path|session\.serialize_handler|session\.use_cookies|session\.use_only_cookies|session\.use_trans_sid|url_rewriter\.tags)|(soap\.wsdl_cache_dir|soap\.wsdl_cache_enabled|soap\.wsdl_cache_limit|soap\.wsdl_cache_ttl)|(sqlite\.assoc_case)|(magic_quotes_sybase|sybase\.allow_persistent|sybase\.compatability_mode|sybase\.max_links|sybase\.max_persistent|sybase\.min_error_severity|sybase\.min_message_severity|sybct\.allow_persistent|sybct\.deadlock_retry_count|sybct\.hostname|sybct\.login_timeout|sybct\.max_links|sybct\.max_persistent|sybct\.min_client_severity|sybct\.min_server_severity|sybct\.timeout)|(tidy\.clean_output|tidy\.default_config)|(unicode\.output_encoding)|(odbc.allow_persistent|odbc.default_db|odbc.default_pw|odbc.default_user|odbc.defaultbinmode|odbc.defaultlrl|odbc.check_persistent|odbc.max_links|odbc.max_persistent)|(zlib\.output_compression_level|zlib\.output_compression|zlib\.output_handler))(\b)/g,
	php_doc: /(@(?:abstract|access|author|category|copyright|deprecated|example|final|filesource|global|ignore|internal|license|link|method|name|package|param|property|return|see|since|static|staticvar|subpackage|todo|tutorial|uses|var|version)|(@(?:example|id|internal|inheritdoc|link|source|toc|tutorial)))(\b)/g, //! tags only at line start: /^\s*\*\s*/m
	http: /\b(100.*|(101.*)|(200.*)|(201.*)|(202.*)|(203.*)|(204.*)|(205.*)|(206.*)|(300.*)|(301.*)|(302.*)|(303.*)|(304.*)|(305.*)|(306.*)|(307.*)|(400.*)|(401.*)|(402.*)|(403.*)|(404.*)|(405.*)|(406.*)|(407.*)|(408.*)|(409.*)|(410.*)|(411.*)|(412.*)|(413.*)|(414.*)|(415.*)|(416.*)|(417.*)|(500.*)|(501.*)|(502.*)|(503.*)|(504.*)|(505.*))\b|\b(Accept|(Accept-Charset)|(Accept-Encoding)|(Accept-Language)|(Accept-Ranges)|(Age)|(Allow)|(Authorization)|(Cache-Control)|(Connection)|(Content-Encoding)|(Content-Language)|(Content-Length)|(Content-Location)|(Content-MD5)|(Content-Range)|(Content-Type)|(Date)|(ETag)|(Expect)|(Expires)|(From)|(Host)|(If-Match)|(If-Modified-Since)|(If-None-Match)|(If-Range)|(If-Unmodified-Since)|(Last-Modified)|(Location)|(Max-Forwards)|(Pragma)|(Proxy-Authenticate)|(Proxy-Authorization)|(Range)|(Referer)|(Retry-After)|(Server)|(TE)|(Trailer)|(Transfer-Encoding)|(Upgrade)|(User-Agent)|(Vary)|(Via)|(Warning)|(WWW-Authenticate)|(Set-Cookie)|(X-Forwarded-For)|(X-Frame-Options))(:|$)/gi,
	sql: /\b(ALTER(?:\s+DEFINER\s*=\s*\S+)?\s+EVENT|(ALTER(?:\s+ONLINE|\s+OFFLINE)?(?:\s+IGNORE)?\s+TABLE)|(ALTER(?:\s+ALGORITHM\s*=\s*(?:UNDEFINED|MERGE|TEMPTABLE))?(?:\s+DEFINER\s*=\s*\S+)?(?:\s+SQL\s+SECURITY\s+(?:DEFINER|INVOKER))?\s+VIEW)|(ANALYZE(?:\s+NO_WRITE_TO_BINLOG|\s+LOCAL)?\s+TABLE)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+EVENT)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+FUNCTION)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+PROCEDURE)|(CREATE(?:\s+ONLINE|\s+OFFLINE)?(?:\s+UNIQUE|\s+FULLTEXT|\s+SPATIAL)?\s+INDEX)|(CREATE(?:\s+TEMPORARY)?\s+TABLE)|(CREATE(?:\s+DEFINER\s*=\s*\S+)?\s+TRIGGER)|(CREATE(?:\s+OR\s+REPLACE)?(?:\s+ALGORITHM\s*=\s*(?:UNDEFINED|MERGE|TEMPTABLE))?(?:\s+DEFINER\s*=\s*\S+)?(?:\s+SQL\s+SECURITY\s+(?:DEFINER|INVOKER))?\s+VIEW)|(DROP(?:\s+ONLINE|\s+OFFLINE)?\s+INDEX)|(DROP(?:\s+TEMPORARY)?\s+TABLE)|(OPTIMIZE(?:\s+NO_WRITE_TO_BINLOG|\s+LOCAL)?\s+TABLE)|(REPAIR(?:\s+NO_WRITE_TO_BINLOG|\s+LOCAL)?\s+TABLE)|(SET(?:\s+GLOBAL|\s+SESSION)?\s+TRANSACTION)|(SHOW(?:\s+FULL)?\s+COLUMNS)|(SHOW(?:\s+STORAGE)?\s+ENGINES)|(SHOW\s+(?:INDEX|INDEXES|KEYS))|(SHOW(?:\s+FULL)?\s+PROCESSLIST)|(SHOW(?:\s+GLOBAL|\s+SESSION)?\s+STATUS)|(SHOW(?:\s+FULL)?\s+TABLES)|(SHOW(?:\s+GLOBAL|\s+SESSION)?\s+VARIABLES)|(ALTER\s+(?:DATABASE|SCHEMA)|ALTER\s+LOGFILE\s+GROUP|ALTER\s+SERVER|ALTER\s+TABLESPACE|BACKUP\s+TABLE|CACHE\s+INDEX|CALL|CHANGE\s+MASTER\s+TO|CHECK\s+TABLE|CHECKSUM\s+TABLE|CREATE\s+(?:DATABASE|SCHEMA)|CREATE\s+LOGFILE\s+GROUP|CREATE\s+SERVER|CREATE\s+TABLESPACE|CREATE\s+USER|DELETE|DESCRIBE|DO|DROP\s+(?:DATABASE|SCHEMA)|DROP\s+EVENT|DROP\s+FUNCTION|DROP\s+PROCEDURE|DROP\s+LOGFILE\s+GROUP|DROP\s+SERVER|DROP\s+TABLESPACE|DROP\s+TRIGGER|DROP\s+USER|DROP\s+VIEW|EXPLAIN|FLUSH|GRANT|HANDLER|HELP|INSERT|INSTALL\s+PLUGIN|JOIN|KILL|LOAD\s+DATA\s+FROM\s+MASTER|LOAD\s+DATA|PURGE\s+MASTER\s+LOGS|RENAME\s+(?:DATABASE|SCHEMA)|RENAME\s+TABLE|RENAME\s+USER|REPLACE|RESET\s+MASTER|RESET\s+SLAVE|RESTORE\s+TABLE|REVOKE|SELECT|SET\s+PASSWORD|SHOW\s+AUTHORS|SHOW\s+BINARY\s+LOGS|SHOW\s+BINLOG\s+EVENTS|SHOW\s+CHARACTER\s+SET|SHOW\s+COLLATION|SHOW\s+CONTRIBUTORS|SHOW\s+CREATE\s+(?:DATABASE|SCHEMA)|SHOW\s+CREATE\s+TABLE|SHOW\s+CREATE\s+VIEW|SHOW\s+(?:DATABASE|SCHEMA)S|SHOW\s+ENGINE|SHOW\s+ERRORS|SHOW\s+GRANTS|SHOW\s+MASTER\s+STATUS|SHOW\s+OPEN\s+TABLES|SHOW\s+PLUGINS|SHOW\s+PRIVILEGES|SHOW\s+SCHEDULER\s+STATUS|SHOW\s+SLAVE\s+HOSTS|SHOW\s+SLAVE\s+STATUS|SHOW\s+TABLE\s+STATUS|SHOW\s+TRIGGERS|SHOW\s+WARNINGS|SHOW|START\s+SLAVE|STOP\s+SLAVE|TRUNCATE|UNINSTALL\s+PLUGIN|UNION|UPDATE|USE)|(START\s+TRANSACTION|COMMIT|ROLLBACK)|(SAVEPOINT|ROLLBACK\s+TO\s+SAVEPOINT)|((?:UN)?LOCK\s+TABLES?)|(IN\s+BOOLEAN\s+MODE|IN\s+NATURAL\s+LANGUAGE\s+MODE|WITH\s+QUERY\s+EXPANSION)|(IS|IS\s+NULL)|(BETWEEN|NOT\s+BETWEEN|IN|NOT\s+IN)|(ANY|SOME)|(ALL)|(EXISTS|NOT\s+EXISTS)|(WITH\s+ROLLUP)|(SOUNDS\s+LIKE)|(LIKE|NOT\s+LIKE)|(NOT\s+REGEXP|REGEXP)|(RLIKE)|(NOT|AND|OR|XOR)|(CASE)|(DIV)|(BINARY)|(CURRENT_DATE|CURRENT_TIME|CURRENT_TIMESTAMP|LOCALTIME|LOCALTIMESTAMP)|(INTERVAL)|(ACCESSIBLE|ADD|ALTER|ANALYZE|AS|ASC|ASENSITIVE|BEFORE|BOTH|BY|CASCADE|CHANGE|CHARACTER|CHECK|COLLATE|COLUMN|CONDITION|CONSTRAINT|CONTINUE|CONVERT|CREATE|CROSS|CURRENT_USER|CURSOR|DATABASE|DATABASES|DAY_HOUR|DAY_MICROSECOND|DAY_MINUTE|DAY_SECOND|DECLARE|DEFAULT|DELAYED|DESC|DETERMINISTIC|DISTINCT|DISTINCTROW|DROP|DUAL|EACH|ELSE|ELSEIF|ENCLOSED|ESCAPED|EXIT|FALSE|FETCH|FLOAT4|FLOAT8|FOR|FORCE|FOREIGN|FROM|FULLTEXT|GROUP|HAVING|HIGH_PRIORITY|HOUR_MICROSECOND|HOUR_MINUTE|HOUR_SECOND|IF|IGNORE|INDEX|INFILE|INNER|INOUT|INSENSITIVE|INT1|INT2|INT3|INT4|INT8|INTO|ITERATE|KEY|KEYS|LEADING|LEAVE|LEFT|LIMIT|LINEAR|LINES|LOAD|LOCK|LONG|LOOP|LOW_PRIORITY|MASTER_SSL_VERIFY_SERVER_CERT|MATCH|MINUTE_MICROSECOND|MINUTE_SECOND|MOD|MODIFIES|NATURAL|NO_WRITE_TO_BINLOG|NULL|ON|OPTIMIZE|OPTION|OPTIONALLY|ORDER|OUT|OUTER|OUTFILE|PRECISION|PRIMARY|PROCEDURE|PURGE|RANGE|READ|READS|READ_WRITE|REFERENCES|RELEASE|RENAME|REPEAT|REQUIRE|RESTRICT|RETURN|RIGHT|SCHEMA|SCHEMAS|SECOND_MICROSECOND|SENSITIVE|SEPARATOR|SET|SPATIAL|SPECIFIC|SQL|SQLEXCEPTION|SQLSTATE|SQLWARNING|SQL_BIG_RESULT|SQL_CALC_FOUND_ROWS|SQL_SMALL_RESULT|SSL|STARTING|STRAIGHT_JOIN|TABLE|TERMINATED|THEN|TO|TRAILING|TRIGGER|TRUE|UNDO|UNIQUE|UNLOCK|UNSIGNED|USAGE|USING|UTC_DATE|UTC_TIME|UTC_TIMESTAMP|VALUES|VARCHARACTER|VARYING|WHEN|WHERE|WHILE|WITH|WRITE|XOR|YEAR_MONTH|ZEROFILL))\b(?!\()|\b(bit|tinyint|bool|boolean|smallint|mediumint|int|integer|bigint|float|double\s+precision|double|real|decimal|dec|numeric|fixed|(date|datetime|timestamp|time|year)|(varchar|binary|varbinary|tinyblob|tinytext|blob|text|mediumblob|mediumtext|longblob|longtext|enum))\b|\b(coalesce|greatest|isnull|interval|least|(if|ifnull|nullif)|(ascii|bin|bit_length|char|char_length|character_length|concat|concat_ws|conv|elt|export_set|field|find_in_set|format|hex|insert|instr|lcase|left|length|load_file|locate|lower|lpad|ltrim|make_set|mid|oct|octet_length|ord|position|quote|repeat|replace|reverse|right|rpad|rtrim|soundex|sounds_like|space|substr|substring|substring_index|trim|ucase|unhex|upper)|(strcmp)|(abs|acos|asin|atan|atan2|ceil|ceiling|cos|cot|crc32|degrees|exp|floor|ln|log|log2|log10|mod|pi|pow|power|radians|rand|round|sign|sin|sqrt|tan|truncate)|(adddate|addtime|convert_tz|curdate|current_date|curtime|current_time|current_timestamp|date|datediff|date_add|date_format|date_sub|day|dayname|dayofmonth|dayofweek|dayofyear|extract|from_days|from_unixtime|get_format|hour|last_day|localtime|localtimestamp|makedate|maketime|microsecond|minute|month|monthname|now|period_add|period_diff|quarter|second|sec_to_time|str_to_date|subdate|subtime|sysdate|time|timediff|timestamp|timestampadd|timestampdiff|time_format|time_to_sec|to_days|unix_timestamp|utc_date|utc_time|utc_timestamp|week|weekday|weekofyear|year|yearweek)|(cast)|(extractvalue|updatexml)|(bit_count)|(aes_encrypt|aes_decrypt|compress|decode|encode|des_decrypt|des_encrypt|encrypt|md5|old_password|password|sha|sha1|uncompress|uncompressed_length)|(benchmark|charset|coercibility|collation|connection_id|current_user|database|found_rows|last_insert_id|row_count|schema|session_user|system_user|user|version)|(default|get_lock|inet_aton|inet_ntoa|is_free_lock|is_used_lock|master_pos_wait|name_const|release_lock|sleep|uuid|uuid_short|values)|(avg|bit_and|bit_or|bit_xor|count|count_distinct|group_concat|min|max|std|stddev|stddev_pop|stddev_samp|sum|var_pop|var_samp|variance)|(row)|(match|against))(\s*\(|$)/gi, // collisions: char, allow parenthesis - IN, ANY, ALL, SOME, NOT, AND, OR, XOR
	sqlset: /\b(ignore_builtin_innodb|innodb_adaptive_hash_index|innodb_additional_mem_pool_size|innodb_autoextend_increment|innodb_autoinc_lock_mode|innodb_buffer_pool_awe_mem_mb|innodb_buffer_pool_size|innodb_commit_concurrency|innodb_concurrency_tickets|innodb_data_file_path|innodb_data_home_dir|innodb_doublewrite|innodb_fast_shutdown|innodb_file_io_threads|innodb_file_per_table|innodb_flush_log_at_trx_commit|innodb_flush_method|innodb_force_recovery|innodb_checksums|innodb_lock_wait_timeout|innodb_locks_unsafe_for_binlog|innodb_log_arch_dir|innodb_log_archive|innodb_log_buffer_size|innodb_log_file_size|innodb_log_files_in_group|innodb_log_group_home_dir|innodb_max_dirty_pages_pct|innodb_max_purge_lag|innodb_mirrored_log_groups|innodb_open_files|innodb_rollback_on_timeout|innodb_stats_on_metadata|innodb_support_xa|innodb_sync_spin_loops|innodb_table_locks|innodb_thread_concurrency|innodb_thread_sleep_delay|innodb_use_legacy_cardinality_algorithm|(ndb[-_]batch[-_]size)|(ndb[-_]log[-_]update[-_]as[-_]write|ndb_log_updated_only)|(ndb_log_orig)|(slave[-_]allow[-_]batching)|(have_ndbcluster|multi_range_count|ndb_autoincrement_prefetch_sz|ndb_cache_check_time|ndb_extra_logging|ndb_force_send|ndb_use_copying_alter_table|ndb_use_exact_count|ndb_wait_connected)|(log[-_]bin[-_]trust[-_]function[-_]creators|log[-_]bin)|(binlog_cache_size|max_binlog_cache_size|max_binlog_size|sync_binlog)|(auto_increment_increment|auto_increment_offset)|(ndb_log_empty_epochs)|(log[-_]slave[-_]updates|report[-_]host|report[-_]password|report[-_]port|report[-_]user|slave[-_]net[-_]timeout|slave[-_]skip[-_]errors)|(init_slave|rpl_recovery_rank|slave_compressed_protocol|slave_exec_mode|slave_transaction_retries|sql_slave_skip_counter)|(master[-_]bind|slave[-_]load[-_]tmpdir|server[-_]id)|(sql_big_tables)|(basedir|big[-_]tables|binlog[-_]format|collation[-_]server|datadir|debug|delay[-_]key[-_]write|engine[-_]condition[-_]pushdown|event[-_]scheduler|general[-_]log|character[-_]set[-_]filesystem|character[-_]set[-_]server|character[-_]sets[-_]dir|init[-_]file|language|large[-_]pages|log[-_]error|log[-_]output|log[-_]queries[-_]not[-_]using[-_]indexes|log[-_]slow[-_]queries|log[-_]warnings|log|low[-_]priority[-_]updates|memlock|min[-_]examined[-_]row[-_]limit|old[-_]passwords|open[-_]files[-_]limit|pid[-_]file|port|safe[-_]show[-_]database|secure[-_]auth|secure[-_]file[-_]priv|skip[-_]external[-_]locking|skip[-_]networking|skip[-_]show[-_]database|slow[-_]query[-_]log|socket|sql[-_]mode|tmpdir|version)|(autocommit|error_count|foreign_key_checks|identity|insert_id|last_insert_id|profiling|profiling_history_size|rand_seed1|rand_seed2|sql_auto_is_null|sql_big_selects|sql_buffer_result|sql_log_bin|sql_log_off|sql_log_update|sql_notes|sql_quote_show_create|sql_safe_updates|sql_warnings|timestamp|unique_checks|warning_count)|(sql_low_priority_updates)|(sql_max_join_size)|(automatic_sp_privileges|back_log|bulk_insert_buffer_size|collation_connection|collation_database|completion_type|concurrent_insert|connect_timeout|date_format|datetime_format|default_week_format|delayed_insert_limit|delayed_insert_timeout|delayed_queue_size|div_precision_increment|expire_logs_days|flush|flush_time|ft_boolean_syntax|ft_max_word_len|ft_min_word_len|ft_query_expansion_limit|ft_stopword_file|general_log_file|group_concat_max_len|have_archive|have_blackhole_engine|have_compress|have_crypt|have_csv|have_dynamic_loading|have_example_engine|have_federated_engine|have_geometry|have_innodb|have_isam|have_merge_engine|have_openssl|have_partitioning|have_query_cache|have_raid|have_row_based_replication|have_rtree_keys|have_ssl|have_symlink|hostname|character_set_client|character_set_connection|character_set_database|character_set_results|character_set_system|init_connect|interactive_timeout|join_buffer_size|keep_files_on_create|key_buffer_size|key_cache_age_threshold|key_cache_block_size|key_cache_division_limit|large_page_size|lc_time_names|license|local_infile|locked_in_memory|log_bin|long_query_time|lower_case_file_system|lower_case_table_names|max_allowed_packet|max_connect_errors|max_connections|max_delayed_threads|max_error_count|max_heap_table_size|max_insert_delayed_threads|max_join_size|max_length_for_sort_data|max_prepared_stmt_count|max_relay_log_size|max_seeks_for_key|max_sort_length|max_sp_recursion_depth|max_tmp_tables|max_user_connections|max_write_lock_count|myisam_data_pointer_size|myisam_max_sort_file_size|myisam_recover_options|myisam_repair_threads|myisam_sort_buffer_size|myisam_stats_method|myisam_use_mmap|named_pipe|net_buffer_length|net_read_timeout|net_retry_count|net_write_timeout|new|old|optimizer_prune_level|optimizer_search_depth|optimizer_switch|plugin_dir|preload_buffer_size|prepared_stmt_count|protocol_version|pseudo_thread_id|query_alloc_block_size|query_cache_limit|query_cache_min_res_unit|query_cache_size|query_cache_type|query_cache_wlock_invalidate|query_prealloc_size|range_alloc_block_size|read_buffer_size|read_only|read_rnd_buffer_size|relay_log_purge|relay_log_space_limit|shared_memory|shared_memory_base_name|slow_launch_time|slow_query_log_file|sort_buffer_size|sql_select_limit|storage_engine|sync_frm|system_time_zone|table_cache|table_definition_cache|table_lock_wait_timeout|table_open_cache|table_type|thread_cache_size|thread_concurrency|thread_handling|thread_stack|time_format|time_zone|timed_mutexes|tmp_table_size|transaction_alloc_block_size|transaction_prealloc_size|tx_isolation|updatable_views_with_limit|version_comment|version_compile_machine|version_compile_os|wait_timeout)|(ssl[-_]ca|ssl[-_]capath|ssl[-_]cert|ssl[-_]cipher|ssl[-_]key))(\b)/gi,
	sqlstatus: /(Com_.+|(.+))()/gi,
	sqlite: /\b(ALTER\s+TABLE|ANALYZE|ATTACH|COPY|DELETE|DETACH|DROP\s+INDEX|DROP\s+TABLE|DROP\s+TRIGGER|DROP\s+VIEW|EXPLAIN|INSERT|CONFLICT|REINDEX|REPLACE|SELECT|UPDATE|TRANSACTION|VACUUM|(PRAGMA)|(CREATE\s+VIRTUAL\s+TABLE)|(BEGIN|COMMIT|ROLLBACK)|(CREATE(?:\s+UNIQUE)?\s+INDEX)|(CREATE(?:\s+TEMP|\s+TEMPORARY)?\s+TABLE)|(CREATE(?:\s+TEMP|\s+TEMPORARY)?\s+TRIGGER)|(CREATE(?:\s+TEMP|\s+TEMPORARY)?\s+VIEW)|(like|glob|regexp|match|escape|isnull|isnotnull|between|exists|case|when|then|else|cast|collate|in|and|or|not))\b|\b(abs|coalesce|glob|ifnull|hex|last_insert_rowid|length|like|load_extension|lower|nullif|quote|random|randomblob|round|soundex|sqlite_version|substr|typeof|upper|(date|time|datetime|julianday|strftime)|(avg|count|max|min|sum|total))(\s*\()/gi, // collisions: min, max, end, like, glob
	pgsql: /\b(COMMIT\s+PREPARED|DROP\s+OWNED|PREPARE\s+TRANSACTION|REASSIGN\s+OWNED|RELEASE\s+SAVEPOINT|ROLLBACK\s+PREPARED|ROLLBACK\s+TO|SET\s+CONSTRAINTS|SET\s+ROLE|SET\s+SESSION\s+AUTHORIZATION|SET\s+TRANSACTION|START\s+TRANSACTION|(ABORT|ALTER\s+AGGREGATE|ALTER\s+CONVERSION|ALTER\s+DATABASE|ALTER\s+DOMAIN|ALTER\s+FUNCTION|ALTER\s+GROUP|ALTER\s+INDEX|ALTER\s+LANGUAGE|ALTER\s+OPERATOR|ALTER\s+ROLE|ALTER\s+SCHEMA|ALTER\s+SEQUENCE|ALTER\s+TABLE|ALTER\s+TABLESPACE|ALTER\s+TRIGGER|ALTER\s+TYPE|ALTER\s+USER|ANALYZE|BEGIN|CHECKPOINT|CLOSE|CLUSTER|COMMENT|COMMIT|COPY|CREATE\s+AGGREGATE|CREATE\s+CAST|CREATE\s+CONSTRAINT|CREATE\s+CONVERSION|CREATE\s+DATABASE|CREATE\s+DOMAIN|CREATE\s+FUNCTION|CREATE\s+GROUP|CREATE\s+INDEX|CREATE\s+LANGUAGE|CREATE\s+OPERATOR|CREATE\s+ROLE|CREATE\s+RULE|CREATE\s+SCHEMA|CREATE\s+SEQUENCE|CREATE\s+TABLE|CREATE\s+TABLE\s+AS|CREATE\s+TABLESPACE|CREATE\s+TRIGGER|CREATE\s+TYPE|CREATE\s+USER|CREATE\s+VIEW|DEALLOCATE|DECLARE|DELETE|DROP\s+AGGREGATE|DROP\s+CAST|DROP\s+CONVERSION|DROP\s+DATABASE|DROP\s+DOMAIN|DROP\s+FUNCTION|DROP\s+GROUP|DROP\s+INDEX|DROP\s+LANGUAGE|DROP\s+OPERATOR|DROP\s+ROLE|DROP\s+RULE|DROP\s+SCHEMA|DROP\s+SEQUENCE|DROP\s+TABLE|DROP\s+TABLESPACE|DROP\s+TRIGGER|DROP\s+TYPE|DROP\s+USER|DROP\s+VIEW|END|EXECUTE|EXPLAIN|FETCH|GRANT|INSERT|LISTEN|LOAD|LOCK|MOVE|NOTIFY|PREPARE|REINDEX|RESET|REVOKE|ROLLBACK|SAVEPOINT|SELECT|SELECT\s+INTO|SET|SHOW|TRUNCATE|UNLISTEN|UPDATE|VACUUM|VALUES)|(ALTER\s+OPERATOR\s+CLASS)|(CREATE\s+OPERATOR\s+CLASS)|(DROP\s+OPERATOR\s+CLASS)|(current_date|current_time|current_timestamp|localtime|localtimestamp|AT\s+TIME\s+ZONE)|(current_user|session_user|user)|(AND|NOT|OR)|(BETWEEN)|(LIKE|SIMILAR\s+TO)|(CASE|WHEN|THEN|ELSE|coalesce|nullif|greatest|least)|(EXISTS|IN|ANY|SOME|ALL))\b|\b(abs|cbrt|ceil|ceiling|degrees|exp|floor|ln|log|mod|pi|power|radians|random|round|setseed|sign|sqrt|trunc|width_bucket|acos|asin|atan|atan2|cos|cot|sin|tan|(bit_length|char_length|convert|lower|octet_length|overlay|position|substring|trim|upper|ascii|btrim|chr|decode|encode|initcap|length|lpad|ltrim|md5|pg_client_encoding|quote_ident|quote_literal|regexp_replace|repeat|replace|rpad|rtrim|split_part|strpos|substr|to_ascii|to_hex|translate)|(get_bit|get_byte|set_bit|set_byte|md5)|(to_char|to_date|to_number|to_timestamp)|(age|clock_timestamp|date_part|date_trunc|extract|isfinite|justify_days|justify_hours|justify_interval|now|statement_timestamp|timeofday|transaction_timestamp)|(area|center|diameter|height|isclosed|isopen|npoints|pclose|popen|radius|width|box|circle|lseg|path|point|polygon)|(abbrev|broadcast|family|host|hostmask|masklen|netmask|network|set_masklen|text|trunc)|(currval|nextval|setval)|(array_append|array_cat|array_dims|array_lower|array_prepend|array_to_string|array_upper|string_to_array)|(avg|bit_and|bit_or|bool_and|bool_or|count|every|max|min|sum|corr|covar_pop|covar_samp|regr_avgx|regr_avgy|regr_count|regr_intercept|regr_r2|regr_slope|regr_sxx|regr_sxy|regr_syy|stddev|stddev_pop|stddev_samp|variance|var_pop|var_samp)|(generate_series)|(current_database|current_schema|current_schemas|inet_client_addr|inet_client_port|inet_server_addr|inet_server_port|pg_my_temp_schema|pg_is_other_temp_schema|pg_postmaster_start_time|version|has_database_privilege|has_function_privilege|has_language_privilege|has_schema_privilege|has_table_privilege|has_tablespace_privilege|pg_has_role|pg_conversion_is_visible|pg_function_is_visible|pg_operator_is_visible|pg_opclass_is_visible|pg_table_is_visible|pg_type_is_visible|format_type|pg_get_constraintdef|pg_get_expr|pg_get_indexdef|pg_get_ruledef|pg_get_serial_sequence|pg_get_triggerdef|pg_get_userbyid|pg_get_viewdef|pg_tablespace_databases|col_description|obj_description|shobj_description)|(current_setting|set_config|pg_cancel_backend|pg_reload_conf|pg_rotate_logfile|pg_start_backup|pg_stop_backup|pg_switch_xlog|pg_current_xlog_location|pg_current_xlog_insert_location|pg_xlogfile_name_offset|pg_xlogfile_name|pg_column_size|pg_database_size|pg_relation_size|pg_size_pretty|pg_tablespace_size|pg_total_relation_size|pg_ls_dir|pg_read_file|pg_stat_file|pg_advisory_lock|pg_advisory_lock_shared|pg_try_advisory_lock|pg_try_advisory_lock_shared|pg_advisory_unlock|pg_advisory_unlock_shared|pg_advisory_unlock_all))(\s*\()/gi, // collisions: IN, ANY, SOME, ALL (array), trunc, md5, abbrev
	cnf: /\b(MaxRequestsPerThread|(AcceptFilter|AcceptPathInfo|AccessFileName|AddDefaultCharset|AddOutputFilterByType|AllowEncodedSlashes|AllowOverride|AuthName|AuthType|CGIMapExtension|ContentDigest|DefaultType|Directory|DirectoryMatch|DocumentRoot|EnableMMAP|EnableSendfile|ErrorDocument|ErrorLog|FileETag|Files|FilesMatch|ForceType|HostnameLookups|IfDefine|IfModule|Include|KeepAlive|KeepAliveTimeout|Limit|LimitExcept|LimitInternalRecursion|LimitRequestBody|LimitRequestFields|LimitRequestFieldSize|LimitRequestLine|LimitXMLRequestBody|Location|LocationMatch|LogLevel|MaxKeepAliveRequests|NameVirtualHost|Options|Require|RLimitCPU|RLimitMEM|RLimitNPROC|Satisfy|ScriptInterpreterSource|ServerAdmin|ServerAlias|ServerName|ServerPath|ServerRoot|ServerSignature|ServerTokens|SetHandler|SetInputFilter|SetOutputFilter|TimeOut|TraceEnable|UseCanonicalName|UseCanonicalPhysicalPort|VirtualHost)|(Action|Script)|(Alias|AliasMatch|Redirect|RedirectMatch|RedirectPermanent|RedirectTemp|ScriptAlias|ScriptAliasMatch)|(AuthBasicAuthoritative|AuthBasicProvider)|(AuthDigestAlgorithm|AuthDigestDomain|AuthDigestNcCheck|AuthDigestNonceFormat|AuthDigestNonceLifetime|AuthDigestProvider|AuthDigestQop|AuthDigestShmemSize)|(AuthnProviderAlias)|(Anonymous|Anonymous_LogEmail|Anonymous_MustGiveEmail|Anonymous_NoUserID|Anonymous_VerifyEmail)|(AuthDBDUserPWQuery|AuthDBDUserRealmQuery)|(AuthDBMType|AuthDBMUserFile)|(AuthDefaultAuthoritative)|(AuthUserFile)|(AuthLDAPBindDN|AuthLDAPBindPassword|AuthLDAPCharsetConfig|AuthLDAPCompareDNOnServer|AuthLDAPDereferenceAliases|AuthLDAPGroupAttribute|AuthLDAPGroupAttributeIsDN|AuthLDAPRemoteUserAttribute|AuthLDAPRemoteUserIsDN|AuthLDAPUrl|AuthzLDAPAuthoritative)|(AuthDBMGroupFile|AuthzDBMAuthoritative|AuthzDBMType)|(AuthzDefaultAuthoritative)|(AuthGroupFile|AuthzGroupFileAuthoritative)|(Allow|Deny|Order)|(AuthzOwnerAuthoritative)|(AuthzUserAuthoritative)|(AddAlt|AddAltByEncoding|AddAltByType|AddDescription|AddIcon|AddIconByEncoding|AddIconByType|DefaultIcon|HeaderName|IndexHeadInsert|IndexIgnore|IndexOptions|IndexOrderDefault|IndexStyleSheet|ReadmeName)|(CacheDefaultExpire|CacheDisable|CacheEnable|CacheIgnoreCacheControl|CacheIgnoreHeaders|CacheIgnoreNoLastMod|CacheIgnoreQueryString|CacheLastModifiedFactor|CacheMaxExpire|CacheStoreNoStore|CacheStorePrivate)|(MetaDir|MetaFiles|MetaSuffix)|(ScriptLog|ScriptLogBuffer|ScriptLogLength)|(ScriptSock)|(Dav|DavDepthInfinity|DavMinTimeout)|(DavLockDB)|(DavGenericLockDB)|(DBDExptime|DBDKeep|DBDMax|DBDMin|DBDParams|DBDPersist|DBDPrepareSQL|DBDriver)|(DeflateBufferSize|DeflateCompressionLevel|DeflateFilterNote|DeflateMemLevel|DeflateWindowSize)|(DirectoryIndex|DirectorySlash)|(CacheDirLength|CacheDirLevels|CacheMaxFileSize|CacheMinFileSize|CacheRoot)|(DumpIOInput|DumpIOLogLevel|DumpIOOutput)|(ProtocolEcho)|(PassEnv|SetEnv|UnsetEnv)|(Example)|(ExpiresActive|ExpiresByType|ExpiresDefault)|(ExtFilterDefine|ExtFilterOptions)|(CacheFile|MMapFile)|(FilterChain|FilterDeclare|FilterProtocol|FilterProvider|FilterTrace)|(Header|RequestHeader)|(CharsetDefault|CharsetOptions|CharsetSourceEnc)|(IdentityCheck|IdentityCheckTimeout)|(ImapBase|ImapDefault|ImapMenu)|(SSIEnableAccess|SSIEndTag|SSIErrorMsg|SSIStartTag|SSITimeFormat|SSIUndefinedEcho|XBitHack)|(AddModuleInfo)|(ISAPIAppendLogToErrors|ISAPIAppendLogToQuery|ISAPICacheFile|ISAPIFakeAsync|ISAPILogNotSupported|ISAPIReadAheadBuffer)|(LDAPCacheEntries|LDAPCacheTTL|LDAPConnectionTimeout|LDAPOpCacheEntries|LDAPOpCacheTTL|LDAPSharedCacheFile|LDAPSharedCacheSize|LDAPTrustedClientCert|LDAPTrustedGlobalCert|LDAPTrustedMode|LDAPVerifyServerCert)|(BufferedLogs|CookieLog|CustomLog|LogFormat|TransferLog)|(ForensicLog)|(MCacheMaxObjectCount|MCacheMaxObjectSize|MCacheMaxStreamingBuffer|MCacheMinObjectSize|MCacheRemovalAlgorithm|MCacheSize)|(AddCharset|AddEncoding|AddHandler|AddInputFilter|AddLanguage|AddOutputFilter|AddType|DefaultLanguage|ModMimeUsePathInfo|MultiviewsMatch|RemoveCharset|RemoveEncoding|RemoveHandler|RemoveInputFilter|RemoveLanguage|RemoveOutputFilter|RemoveType|TypesConfig)|(MimeMagicFile)|(CacheNegotiatedDocs|ForceLanguagePriority|LanguagePriority)|(NWSSLTrustedCerts|NWSSLUpgradeable|SecureListen)|(AllowCONNECT|BalancerMember|NoProxy|Proxy|ProxyBadHeader|ProxyBlock|ProxyDomain|ProxyErrorOverride|ProxyFtpDirCharset|ProxyIOBufferSize|ProxyMatch|ProxyMaxForwards|ProxyPass|ProxyPassInterpolateEnv|ProxyPassMatch|ProxyPassReverse|ProxyPassReverseCookieDomain|ProxyPassReverseCookiePath|ProxyPreserveHost|ProxyReceiveBufferSize|ProxyRemote|ProxyRemoteMatch|ProxyRequests|ProxySet|ProxyStatus|ProxyTimeout|ProxyVia)|(RewriteBase|RewriteCond|RewriteEngine|RewriteLock|RewriteLog|RewriteLogLevel|RewriteMap|RewriteOptions|RewriteRule)|(BrowserMatch|BrowserMatchNoCase|SetEnvIf|SetEnvIfNoCase)|(LoadFile|LoadModule)|(CheckCaseOnly|CheckSpelling)|(SSLCACertificateFile|SSLCACertificatePath|SSLCADNRequestFile|SSLCADNRequestPath|SSLCARevocationFile|SSLCARevocationPath|SSLCertificateChainFile|SSLCertificateFile|SSLCertificateKeyFile|SSLCipherSuite|SSLCryptoDevice|SSLEngine|SSLHonorCipherOrder|SSLMutex|SSLOptions|SSLPassPhraseDialog|SSLProtocol|SSLProxyCACertificateFile|SSLProxyCACertificatePath|SSLProxyCARevocationFile|SSLProxyCARevocationPath|SSLProxyCipherSuite|SSLProxyEngine|SSLProxyMachineCertificateFile|SSLProxyMachineCertificatePath|SSLProxyProtocol|SSLProxyVerify|SSLProxyVerifyDepth|SSLRandomSeed|SSLRequire|SSLRequireSSL|SSLSessionCache|SSLSessionCacheTimeout|SSLUserName|SSLVerifyClient|SSLVerifyDepth)|(ExtendedStatus|SeeRequestTail)|(Substitute)|(SuexecUserGroup)|(UserDir)|(CookieDomain|CookieExpires|CookieName|CookieStyle|CookieTracking)|(IfVersion)|(VirtualDocumentRoot|VirtualDocumentRootIP|VirtualScriptAlias|VirtualScriptAliasIP)|(AcceptMutex|ChrootDir|CoreDumpDirectory|EnableExceptionHook|GracefulShutdownTimeout|Group|Listen|ListenBackLog|LockFile|MaxClients|MaxMemFree|MaxRequestsPerChild|MaxSpareThreads|MinSpareThreads|PidFile|ReceiveBufferSize|ScoreBoardFile|SendBufferSize|ServerLimit|StartServers|StartThreads|ThreadLimit|ThreadsPerChild|ThreadStackSize|User)|(MaxThreads)|(Win32DisableAcceptEx)|(MaxSpareServers|MinSpareServers))(\b)/g,
	js: /\b(String\.fromCharCode|Date\.(?:parse|UTC)|Math\.(?:E|LN2|LN10|LOG2E|LOG10E|PI|SQRT1_2|SQRT2|abs|acos|asin|atan|atan2|ceil|cos|exp|floor|log|max|min|pow|random|round|sin|sqrt|tan)|Array|Boolean|Date|Error|Function|JavaArray|JavaClass|JavaObject|JavaPackage|Math|Number|Object|Packages|RegExp|String|(Infinity|NaN|undefined)|(decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt)|(break|continue|for|function|return|switch|throw|var|while|with)|(do)|(if|else)|(try|catch|finally)|(delete|in|instanceof|new|this|typeof|void)|(alinkColor|anchors|applets|bgColor|body|characterSet|compatMode|contentType|cookie|defaultView|designMode|doctype|documentElement|domain|embeds|fgColor|forms|height|images|implementation|lastModified|linkColor|links|plugins|popupNode|referrer|styleSheets|title|tooltipNode|URL|vlinkColor|width|clear|createAttribute|createDocumentFragment|createElement|createElementNS|createEvent|createNSResolver|createRange|createTextNode|createTreeWalker|evaluate|execCommand|getElementById|getElementsByName|importNode|loadOverlay|queryCommandEnabled|queryCommandIndeterm|queryCommandState|queryCommandValue|write|writeln)|(attributes|childNodes|className|clientHeight|clientLeft|clientTop|clientWidth|dir|firstChild|id|innerHTML|lang|lastChild|length|localName|name|namespaceURI|nextSibling|nodeName|nodeType|nodeValue|offsetHeight|offsetLeft|offsetParent|offsetTop|offsetWidth|ownerDocument|parentNode|prefix|previousSibling|scrollHeight|scrollLeft|scrollTop|scrollWidth|style|tabIndex|tagName|textContent|addEventListener|appendChild|blur|click|cloneNode|dispatchEvent|focus|getAttribute|getAttributeNS|getAttributeNode|getAttributeNodeNS|getElementsByTagName|getElementsByTagNameNS|hasAttribute|hasAttributeNS|hasAttributes|hasChildNodes|insertBefore|item|normalize|removeAttribute|removeAttributeNS|removeAttributeNode|removeChild|removeEventListener|replaceChild|scrollIntoView|setAttribute|setAttributeNS|setAttributeNode|setAttributeNodeNS|supports|onblur|onchange|onclick|ondblclick|onfocus|onkeydown|onkeypress|onkeyup|onmousedown|onmousemove|onmouseout|onmouseover|onmouseup|onresize)|(altKey|bubbles|button|cancelBubble|cancelable|clientX|clientY|ctrlKey|currentTarget|detail|eventPhase|explicitOriginalTarget|isChar|layerX|layerY|metaKey|originalTarget|pageX|pageY|relatedTarget|screenX|screenY|shiftKey|target|timeStamp|type|view|which|initEvent|initKeyEvent|initMouseEvent|initUIEvent|stopPropagation|preventDefault)|(elements|length|name|acceptCharset|action|enctype|encoding|method|submit|reset)|(caption|tHead|tFoot|rows|tBodies|align|bgColor|border|cellPadding|cellSpacing|frame|rules|summary|width|createTHead|deleteTHead|createTFoot|deleteTFoot|createCaption|deleteCaption|insertRow|deleteRow)|(content|closed|controllers|crypto|defaultStatus|directories|document|frameElement|frames|history|innerHeight|innerWidth|length|location|locationbar|menubar|name|navigator|opener|outerHeight|outerWidth|pageXOffset|pageYOffset|parent|personalbar|pkcs11|screen|availTop|availLeft|availHeight|availWidth|colorDepth|height|left|pixelDepth|top|width|scrollbars|scrollMaxX|scrollMaxY|scrollX|scrollY|self|sidebar|status|statusbar|toolbar|window|alert|atob|back|btoa|captureEvents|clearInterval|clearTimeout|close|confirm|dump|escape|find|forward|getAttention|getComputedStyle|getSelection|home|moveBy|moveTo|open|openDialog|print|prompt|releaseEvents|resizeBy|resizeTo|scroll|scrollBy|scrollByLines|scrollByPages|scrollTo|setInterval|setTimeout|sizeToContent|stop|unescape|updateCommands|onabort|onclose|ondragdrop|onerror|onload|onpaint|onreset|onscroll|onselect|onsubmit|onunload))\b|\b(pop|push|reverse|shift|sort|splice|unshift|concat|join|slice|(getDate|getDay|getFullYear|getHours|getMilliseconds|getMinutes|getMonth|getSeconds|getTime|getTimezoneOffset|getUTCDate|getUTCDay|getUTCFullYear|getUTCHours|getUTCMilliseconds|getUTCMinutes|getUTCMonth|getUTCSeconds|setDate|setFullYear|setHours|setMilliseconds|setMinutes|setMonth|setSeconds|setTime|setUTCDate|setUTCFullYear|setUTCHours|setUTCMilliseconds|setUTCMinutes|setUTCMonth|setUTCSeconds|toDateString|toLocaleDateString|toLocaleTimeString|toTimeString|toUTCString)|(apply|call)|(toExponential|toFixed|toPrecision)|(exec|test)|(charAt|charCodeAt|concat|indexOf|lastIndexOf|localeCompare|match|replace|search|slice|split|substr|substring|toLocaleLowerCase|toLocaleUpperCase|toLowerCase|toUpperCase))(\s*\()/g // collisions: bgColor, height, width,length, name
};
