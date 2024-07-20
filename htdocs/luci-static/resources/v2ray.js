/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */
"use strict";"require fs";"require network";"require uci";"require validation";return L.Class.extend({getLocalIPs:function(){return network.getNetworks().then((function(e){for(var r=["127.0.0.1","0.0.0.0","::"],t=0,a=e;t<a.length;t++){var n=a[t],i=n.getIPAddr(),s=n.getIP6Addr();i&&(i=i.split("/")[0])&&r.indexOf(i)<0&&r.push(i),s&&(s=s.split("/")[0])&&r.indexOf(s)<0&&r.push(s)}return r.sort()}))},getCore:function(){return uci.load("v2ray").then((function(){var e=uci.get("v2ray","main","core");return e||"V2ray"}))},getSections:function(e,r){return void 0===r&&(r="alias"),uci.load("v2ray").then((function(){var t=[];return uci.sections("v2ray",e,(function(e){var a=e[r];a&&t.push({caption:a,value:e[".name"]})})),t}))},getDokodemoDoorPorts:function(){return uci.load("v2ray").then((function(){var e=[];return uci.sections("v2ray","inbound",(function(r){var t;if("dokodemo-door"==r.protocol&&(t=r.port)){var a;(a=r.alias)?e.push({caption:"%s - %s".format(a,t),value:t}):e.push({caption:"%s:%s".format(r.listen,t),value:t})}})),e}))},getXtlsSecurity:function(){return uci.load("v2ray").then((function(){var e=[];return uci.sections("v2ray","v2ray",(function(r){"Xray"==r.core&&("1"==r.reality?e.push({security:["reality|REALITY"],flow:["xtls-rprx-vision","xtls-rprx-vision-udp443"]}):e.push({security:["xtls|XTLS"],flow:["xtls-rprx-direct","xtls-rprx-direct-udp443","xtls-rprx-origin","xtls-rprx-origin-udp443","xtls-rprx-splice","xtls-rprx-splice-udp443"]}))})),e}))},domainRule:function(e,r){void 0===r&&(r=!1);var t=/^localhost$/i,a=/^((?!-)[A-Za-z0-9-]{1,63}(?<!-)\.)+[A-Za-z]{2,6}$/;if(r)return!(!e.match(a)&&!e.match(t));if(e.match(a)||e.match(t))return!0;var n=e.match(/^(\S+):(\S+)$/);if(n)switch(n[1]){case"full":case"domain":if(n[2].match(a))return!0;break;case"geosite":if(n[2].match(/^[a-zA-Z][a-zA-Z!-@.]*[a-zA-Z]$/))return!0;break;case"regexp":if(0!==n[2].length)try{return new RegExp(n[2]),!0}catch(e){return!1}break;case"keyword":if(n[2].match(/^[a-zA-Z0-9-.]+$/))return!0;break;default:return!1}return!1},ipRule:function(e,r){if(void 0===r&&(r=!1),r){for(var t=0,a=e.split(",");t<a.length;t++){var n=a[t];if(!(n.length>0))return!1;var i=validation.parseIPv4(n),s=validation.parseIPv6(n);if(null===i&&null===s)return!1}return!0}i=validation.parseIPv4(e),s=validation.parseIPv6(e);if(null!=i||null!=s)return!0;var o=e.split("/");if(!o||2!=o.length)return!!e.match(/^geoip:[a-zA-Z]{2}[a-zA-Z0-9@!-]*(?<![@!0-9-])$/);var u=validation.parseIPv4(o[0]),c=validation.parseIPv6(o[0]);return!!(u&&0<=parseInt(o[1])&&parseInt(o[1])<=32||c&&0<=parseInt(o[1])&&parseInt(o[1])<=128)},v2rayValidation:function(e,r,t){var a="%s\n   %s\n   %s\n   %s\n   %s\n   %s\n   %s".format(_("Valid domain matching rules:"),_('match by subdomain, eg: "domain:google.com"'),_('strict match, eg: "full:ipv6.google.com"'),_('match by predefined domain list, eg: "geosite:google"'),_('match by keywords, eg: "keyword:google"'),_('match by regular expression, eg: "regexp:\\.goo.*gle\\.com"'),_('plain strings, eg: "google.com"')),n=" - %s\n   %s".format(_("'value1,value2,value3'"),_("each value should be an integer between 0-255")),i=/^localhost$/i;switch(e){case"wg-keys":return null!==r.match("^[a-zA-Z0-9/+]+=?=?$")&&r.length%4==0&&44===r.length||_("Invalid WireGuard key");case"wg-reserved":var s=r.match(/^(\d{1,3}),(\d{1,3}),(\d{1,3})$/);if(!s)return"%s:\n%s".format(_("Expecting"),n);var o=s.map(Number);return!![o[1],o[2],o[3]].every((function(e){return e>=0&&e<=255}))||"%s:\n%s".format(_("Expecting"),n);case"fragment-length":if(/^\d+$/.test(r)&&parseInt(r)>0)return!0;var u=r.split("-"),c=parseInt(u[0]),l=parseInt(u[1]);return c>0&&l>c||"%s:\n - %s\n - %s".format(_("Expecting"),_("Integers greater than 0"),_("A range of integers which are greater than 0"));case"fragment-interval":if(/^\d+$/.test(r)&&parseInt(r)>0)return!0;if(/^\d+-\d+$/.test(r)){var g=r.split("-"),p=parseInt(g[0]),d=parseInt(g[1]);if(p>0&&d>p)return!0}return"%s:\n - %s\n - %s".format(_("Expecting"),_("Integers greater than 0"),_("A range of integers which are greater than 0"));case"fragment-packets":if(/^\d+$/.test(r)&&parseInt(r)>0)return!0;if(/^\d+-\d+$/.test(r)){var h=r.split("-"),f=parseInt(h[0]),m=parseInt(h[1]);if(f>0&&m>f)return!0}return"tlshello"===r||"%s:\n - %s\n   %s\n - %s\n   %s".format(_("Expecting"),_("an integer greater than 0 corresponding to the sequence number of the packet"),_("eg: '5' for the fifth packet'"),_("A range of integers which are greater than 0"),_("eg: '1-3' for the 1st to 3rd packets"));case"hostmapping":var v=r.match(/^(\S+)\|(\S+)$/);if(v)if(this.domainRule(v[1])){var x=this.domainRule(v[2],!0),I=this.ipRule(v[2],!0);if(x||I)return!0}return'%s: "%s" "%s"\n - %s\n - %s\n   %s\n   %s\n   %s'.format(_("Expecting"),_("domain matching rules"),_("mapping objects"),a,_("Valid mapping objects:"),_('IP address, eg: "8.8.8.8"'),_('IP address array, eg: "8.8.8.8,2001:4860:4860::8888,8.8.4.4"'),_('domain name, eg: "www.google.com"'));case"iprule":return!!this.ipRule(r)||"%s:\n - %s\n - %s\n - %s".format(_("Expecting"),_('IP address, eg: "8.8.8.8"'),_('CIDR, eg: "2606:4700::/32"'),_('Predifined IP List, eg: "geoip:us"'));case"domainrule":return!!this.domainRule(r)||"%s%s:\n - %s".format(_("Expecting"),_("domain matching rules"),a);case"path":return!!r.match(/^\/[a-z0-9-_/?=]*(?<![-?=])$/i)||_("Invalid Path");case"sni":var y="%s: %s".format(_("Expecting"),_("a valid domain name")),w="s_"+uci.get("v2ray",t,"protocol")+"_address",k=uci.get("v2ray",t,w);return!r&&!this.ipRule(k)||(!(r.match(i)||!this.domainRule(r,!0))||y);case"reverse":var $=r.match(/^(\S+)\|(\S+)$/);return!(!$||!$[1].match(/^[a-z0-9_]+[a-z0-9]$/i)||$[2].match(i)||!this.domainRule($[2],!0))||"%s: %s".format(_("Expecting"),'"tag|domain.name"');default:return _("Invalid Input")}}});