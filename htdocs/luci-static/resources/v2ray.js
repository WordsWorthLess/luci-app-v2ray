/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */
"use strict";"require fs";"require network";"require uci";"require validation";return L.Class.extend({getLocalIPs:function(){return network.getNetworks().then((function(e){for(var r=["127.0.0.1","0.0.0.0","::"],t=0,n=e;t<n.length;t++){var a=n[t],i=a.getIPAddr(),s=a.getIP6Addr();i&&(i=i.split("/")[0])&&r.indexOf(i)<0&&r.push(i),s&&(s=s.split("/")[0])&&r.indexOf(s)<0&&r.push(s)}return r.sort()}))},getCore:function(){return uci.load("v2ray").then((function(){var e=uci.get("v2ray","main","core");e||(e="V2Ray")}))},getSections:function(e,r){return void 0===r&&(r="alias"),uci.load("v2ray").then((function(){var t=[];return uci.sections("v2ray",e,(function(e){var n=e[r];n&&t.push({caption:n,value:e[".name"]})})),t}))},getDokodemoDoorPorts:function(){return uci.load("v2ray").then((function(){var e=[];return uci.sections("v2ray","inbound",(function(r){var t;if("dokodemo-door"==r.protocol&&(t=r.port)){var n;(n=r.alias)?e.push({caption:"%s - %s".format(n,t),value:t}):e.push({caption:"%s:%s".format(r.listen,t),value:t})}})),e}))},getXtlsSecurity:function(){return uci.load("v2ray").then((function(){var e=[];return uci.sections("v2ray","v2ray",(function(r){"Xray"==r.core&&("1"==r.reality?e.push({security:["reality|REALITY"],flow:["xtls-rprx-vision","xtls-rprx-vision-udp443"]}):e.push({security:["xtls|XTLS"],flow:["xtls-rprx-direct","xtls-rprx-direct-udp443","xtls-rprx-origin","xtls-rprx-origin-udp443","xtls-rprx-splice","xtls-rprx-splice-udp443"]}))})),e}))},domainRule:function(e,r){void 0===r&&(r=!1);var t=/^localhost$/i,n=/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}$/,a=/^[a-zA-Z0-9-.]+$/;if(r)return!(!e.match(n)&&!e.match(t));if(e.match(n)||e.match(t)||e.match(a))return!0;var i=e.match(/^(\S+):(\S+)$/);if(i)switch(i[1]){case"domain":if(i[2].match(n))return!0;break;case"geosite":if(i[2].match(/^[a-zA-Z][a-zA-Z!-@.]*[a-zA-Z]$/))return!0;break;case"regexp":if(0!==i[2].length)try{return new RegExp(i[2]),!0}catch(e){return!1}break;case"keyword":if(i[2].match(a))return!0;break;default:return!1}return!1},ipRule:function(e,r){if(void 0===r&&(r=!1),r){for(var t=0,n=e.split(",");t<n.length;t++){var a=n[t];if(!(a.length>0))return!1;var i=validation.parseIPv4(a),s=validation.parseIPv6(a);if(null===i&&null===s)return!1}return!0}i=validation.parseIPv4(e),s=validation.parseIPv6(e);if(null!=i||null!=s)return!0;var o=e.split("/");if(!o||2!=o.length)return!!e.match(/^geoip:[a-zA-Z]{2}[a-zA-Z0-9@!-]*(?<![@!0-9-])$/);var u=validation.parseIPv4(o[0]),c=validation.parseIPv6(o[0]);return!!(u&&0<=parseInt(o[1])&&parseInt(o[1])<=32||c&&0<=parseInt(o[1])&&parseInt(o[1])<=128)},v2rayValidation:function(e,r){var t="%s\n   %s\n   %s\n   %s\n   %s\n   %s\n   %s".format(_("Valid domain matching conditions:"),_('match by subdomain , eg: "domain:google.com"'),_('strict match, eg: "full:ipv6.google.com"'),_('match by predefined domain list, eg: "geosite:google"'),_('match by keywords, eg: "keyword:google"'),_('match by regular expression, eg: "regexp:\\.goo.*gle\\.com"'),_('plain text, eg: "google.com"'));switch(e){case"wg-keys":return null!==r.match("^[a-zA-Z0-9/+]+=?=?$")&&r.length%4==0&&44===r.length||_("Invalid WireGuard key");case"wg-reserved":var n=r.match(/^(\d{1,3}),(\d{1,3}),(\d{1,3})$/);if(!n)return"%s:\n- %s\n  %s".format(_("Expecting"),_("'value1,value2,value3'"),_("each value should be an integer between 0-255"));var a=n.map(Number);return!![a[1],a[2],a[3]].every((function(e){return e>=0&&e<=255}))||"%s:\n- %s\n  %s".format(_("Expecting"),_("'value1,value2,value3'"),_("each value should be an integer between 0-255"));case"fragment-length":if(/^\d+$/.test(r)&&parseInt(r)>0)return!0;var i=r.split("-"),s=parseInt(i[0]),o=parseInt(i[1]);return s>0&&o>s||"%s:\n- %s\n- %s".format(_("Expecting"),_("Integers greater than 0"),_("A range of integers which are greater than 0"));case"fragment-interval":if(/^\d+$/.test(r)&&parseInt(r)>0)return!0;if(/^\d+-\d+$/.test(r)){var u=r.split("-"),c=parseInt(u[0]),l=parseInt(u[1]);if(c>0&&l>c)return!0}return"%s:\n- %s\n- %s".format(_("Expecting"),_("Integers greater than 0"),_("A range of integers which are greater than 0"));case"fragment-packets":if(/^\d+$/.test(r)&&parseInt(r)>0)return!0;if(/^\d+-\d+$/.test(r)){var g=r.split("-"),p=parseInt(g[0]),d=parseInt(g[1]);if(p>0&&d>p)return!0}return"tlshello"===r||"%s:\n - %s\n   %s\n - %s\n   %s".format(_("Expecting"),_("an integer greater than 0 corresponding to the sequence number of the packet"),_("eg: '5' for the fifth packet'"),_("A range of integers which are greater than 0"),_("eg: '1-3' for the 1st to 3rd packets"));case"hostmapping":var f=r.match(/^(\S+)\|(\S+)$/);if(f)if(this.domainRule(f[1])){var h=this.domainRule(f[2],!0),v=this.ipRule(f[2],!0);if(h||v)return!0}return"%s: %s:\n - %s\n - %s\n   %s\n   %s\n   %s".format(_("Expecting"),"domain_match_conditions|mapping_objects",t,_("Valid mapping objects:"),_('IP address, eg: "8.8.8.8"'),_('IP address array, eg: "8.8.8.8,2001:4860:4860::8888,8.8.4.4"'),_('domain name, eg: "www.google.com"'));case"iprule":return!!this.ipRule(r)||"%s:\n   %s\n   %s\n   %s\n   %s\n".fromat(_("Expecting"),_('IP address, eg: "8.8.8.8"'),_('CIDR, eg: "2606:4700::/32"'),_('Predifined IP List, eg: "geoip:us"'));case"domainrule":return!!this.domainRule(r)||"%s: %s\n - %s".fromat(_("Expecting"),_("domain matching conditions"),t);default:return _("Invalid Input")}}});