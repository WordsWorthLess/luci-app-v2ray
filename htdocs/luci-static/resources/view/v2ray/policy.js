/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */
"use strict";"require form";"require uci";"require v2ray";return L.view.extend({load:function(){return Promise.all([v2ray.getSections("policy_level","level"),v2ray.getCore()])},render:function(e){var o,n=void 0===e?[]:e,l=n[0],t=void 0===l?[]:l,a=n[1],i=void 0===a?"":a,r=new form.Map("v2ray","%s - %s".format(i,_("Policy")),_("Details: %s").format('<a href="https://www.v2ray.com/en/configuration/policy.html#policyobject" target="_blank">PolicyObject</a>')),s=r.section(form.NamedSection,"main_policy","policy");s.anonymous=!0,s.addremove=!1,(o=s.option(form.Flag,"enabled",_("Enabled"))).rmempty=!1,o=s.option(form.MultiValue,"levels",_("Levels"),_("Select policy levels"));for(var d=0,u=t;d<u.length;d++){var p=u[d];o.value(p.value,p.caption)}o=s.option(form.Flag,"system_stats_inbound_uplink","%s - %s".format(_("System"),_("Stats inbound uplink"))),o=s.option(form.Flag,"system_stats_inbound_downlink","%s - %s".format(_("System"),_("Stats inbound downlink")));var m=r.section(form.GridSection,"policy_level",_("Policy Level"),_("Add policy levels here"));return m.anonymous=!0,m.addremove=!0,m.sortable=!0,m.nodescription=!0,(o=m.option(form.Value,"level",_("Level"))).rmempty=!1,o.datatype="uinteger",(o=m.option(form.Value,"handshake",_("Handshake"))).datatype="uinteger",o.placeholder="4",(o=m.option(form.Value,"conn_idle",_("Connection idle"))).datatype="uinteger",o.placeholder="300",(o=m.option(form.Value,"uplink_only",_("Uplink only"))).modalonly=!0,o.datatype="uinteger",o.placeholder="2",(o=m.option(form.Value,"downlink_only",_("Downlink only"))).modalonly=!0,o.datatype="uinteger",o.placeholder="5",(o=m.option(form.Flag,"stats_user_uplink",_("Stats user uplink"))).modalonly=!0,(o=m.option(form.Flag,"stats_user_downlink",_("Stats user downlink"))).modalonly=!0,(o=m.option(form.Value,"buffer_size",_("Buffer size"))).datatype="uinteger",r.render()}});