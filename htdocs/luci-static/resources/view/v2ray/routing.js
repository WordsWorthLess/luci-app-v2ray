/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */
"use strict";"require form";"require uci";"require v2ray";return L.view.extend({load:function(){return Promise.all([v2ray.getSections("routing_rule"),v2ray.getSections("routing_balancer","tag"),v2ray.getSections("inbound","alias"),v2ray.getSections("inbound","tag"),v2ray.getSections("outbound","alias"),v2ray.getSections("outbound","tag"),v2ray.getSections("dns","tag"),v2ray.getSections("reverse","bridges"),v2ray.getSections("reverse","portals")])},render:function(o){var t,a=void 0===o?[]:o,e=a[0],r=void 0===e?[]:e,n=a[1],i=void 0===n?[]:n,l=a[2],u=void 0===l?[]:l,s=a[3],m=void 0===s?[]:s,c=a[4],d=void 0===c?[]:c,v=a[5],p=void 0===v?[]:v,g=a[6],f=void 0===g?[]:g,y=a[7],b=void 0===y?[]:y,h=a[8],S=void 0===h?[]:h,D=new form.Map("v2ray","%s - %s".format(uci.get("v2ray","main","core"),_("Routing")),_("Details: %s").format('<a href="https://xtls.github.io/config/routing.html#routingobject" target="_blank">RoutingObject</a>')),V=D.section(form.NamedSection,"main_routing","routing");V.anonymous=!0,V.addremove=!1,t=V.option(form.Flag,"enabled",_("Enabled")),(t=V.option(form.ListValue,"domain_strategy",_("Domain resolution strategy"))).value("AsIs"),t.value("IPIfNonMatch"),t.value("IPOnDemand"),(t=V.option(form.ListValue,"main_domain_matcher",_("Domain Matcher"))).value("hybrid"),t.value("linear"),t=V.option(form.MultiValue,"rules",_("Rules"),_("Select routing rules to use"));for(var L=0,M=r;L<M.length;L++){var P=M[L];t.value(P.value,P.caption)}t=V.option(form.MultiValue,"balancers",_("Balancers"),_("Select routing balancers to use"));for(var I=0,R=i;I<R.length;I++){P=R[I];t.value(P.value,P.caption)}var A=D.section(form.GridSection,"routing_rule",_("Routing Rule"),_("Add routing rules here"));A.anonymous=!1,A.addremove=!0,A.sortable=!0,A.nodescription=!0,(t=A.option(form.Value,"alias",_("Alias"))).rmempty=!1,(t=A.option(form.ListValue,"domain_matcher",_("Domain Matcher"))).value("hybrid"),t.value("linear"),(t=A.option(form.ListValue,"type",_("Type"))).value("field"),(t=A.option(form.DynamicList,"domain",_("Domain"))).modalonly=!0,(t=A.option(form.DynamicList,"ip",_("IP"))).modalonly=!0,(t=A.option(form.DynamicList,"port",_("Port"))).modalonly=!0,t.datatype="or(port, portrange)",(t=A.option(form.MultiValue,"network",_("Network"))).value("tcp"),t.value("udp"),(t=A.option(form.DynamicList,"source",_("Source"))).modalonly=!0,t.datatype="ipaddr",(t=A.option(form.DynamicList,"source_port",_("Source Port"))).modalonly=!0,t.datatype="or(port, portrange)",(t=A.option(form.DynamicList,"user",_("User"))).modalonly=!0,(t=A.option(form.MultiValue,"inbound_tag",_("Inbound Tag"))).value(f[0].caption,"DNS("+f[0].caption+")");for(var O=0;O<u.length;O++)t.value(m[O].caption,u[O].caption+"("+m[O].caption+")");for(var w=0,x=b;w<x.length;w++)for(var N=x[w],T=0,k=String(N.caption).split(",");T<k.length;T++){var q=k[T];t.value(q.substring(0,q.indexOf("|")),q)}(t=A.option(form.MultiValue,"protocol",_("Protocol"))).modalonly=!0,t.value("http"),t.value("tls"),t.value("bittorrent"),(t=A.option(form.Value,"attrs",_("Attrs"))).modalonly=!0,t=A.option(form.ListValue,"outbound_tag",_("Outbound tag"));for(O=0;O<d.length;O++)t.value(p[O].caption,d[O].caption+"("+p[O].caption+")");for(var B=0,j=S;B<j.length;B++)for(var E=j[B],F=0,G=String(E.caption).split(",");F<G.length;F++){var U=G[F];t.value(U.substring(0,U.indexOf("|")),U)}(t=A.option(form.Value,"balancer_tag",_("Balancer tag"))).modalonly=!0,t.depends("outbound_tag","");var z=D.section(form.TypedSection,"routing_balancer",_("Routing Balancer",_("Add routing balancers here")));return z.anonymous=!0,z.addremove=!0,(t=z.option(form.Value,"tag",_("Tag"))).rmempty=!1,t=z.option(form.DynamicList,"selector",_("Selector")),D.render()}});