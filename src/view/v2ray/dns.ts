/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */

"use strict";

"require form";
"require v2ray";
"require uci";
// "require view";

// @ts-ignore
return L.view.extend<SectionItem[], string>({
  load: function () {
    return Promise.all([v2ray.getSections("dns_server"), v2ray.getCore()]);
  },

  render: function ([dnsServers = [], core = ""] = []) {
    const m = new form.Map(
      "v2ray",
      "%s - %s".format(core, _("DNS")),
      _("Details: %s").format(
        '<a href="https://xtls.github.io/en/config/dns.html#dnsobject" target="_blank">DnsObject</a>'
      )
    );

    const s1 = m.section(form.NamedSection, "main_dns", "dns");
    s1.anonymous = true;
    s1.addremove = false;

    let o;

    o = s1.option(form.Flag, "enabled", _("Enabled"));
    o.rmempty = false;

    o = s1.option(form.Value, "tag", _("Tag"));
    o.rmempty = false;

    o = s1.option(
      form.Value,
      "client_ip",
      _("Client IP"),
      '<a href="https://icanhazip.com" target="_blank">%s</a>'.format(
        _("Get my public IP address")
      )
    );
    o.datatype = "ipaddr";

    o = s1.option(
      form.DynamicList,
      "hosts",
      _("Hosts"),
      _(
        "Host and domain mapping</br>format: <code>domain|ip1,ip2</code> or <code>domain-A|domain-B</code> eg: </br>%s or %s"
      ).format(
        "<code>dns.google|8.8.8.8,8.8.4.4</code>",
        "<code>google.cn|google.com</code>"
      )
    );
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      }
      return v2ray.v2rayValidation("hostmapping", Value);
    };
    o.rmempty = true;

    o = s1.option(form.ListValue, "query_strategy", _("Domain Strategy"));
    o.value("UseIP");
    o.value("UseIPv4");
    o.value("UseIPv6");

    o = s1.option(form.ListValue, "disable_cache", _("Disable DNS Cache"));
    o.value("0", _("False"));
    o.value("1", _("True"));

    o = s1.option(
      form.ListValue,
      "disable_fallback",
      _("Disable Fallback Query")
    );
    o.value("0", _("False"));
    o.value("1", _("True"));

    o = s1.option(
      form.ListValue,
      "disable_fallback_if_match",
      _("Disable Fallback if got Matches")
    );
    o.value("0", _("False"));
    o.value("1", _("True"));

    o = s1.option(form.MultiValue, "servers", _("DNS Servers"));
    for (const d of dnsServers) {
      o.value(d.value, d.caption);
    }

    const s2 = m.section(
      form.GridSection,
      "dns_server",
      _("DNS server"),
      _("Add DNS servers here")
    );
    s2.sectiontitle = function (section_name: string) {
      const section_title = uci.get("v2ray", section_name, "alias");
      return section_title;
    };
    s2.modaltitle = function (sid: string) {
      const alias = uci.get("v2ray", sid, "alias");
      return `${_("DNS server")} > ${alias ?? _("Add")}`;
    };
    s2.addremove = true;
    s2.nodescription = true;
    s2.sortable = true;

    o = s2.option(form.Value, "alias", _("Alias"));
    o.rmempty = false;
    o.modalonly = true;

    o = s2.option(form.ListValue, "dns_server_type", _("Type"));
    o.value("DoH");
    o.value("fakedns");
    o.value("localhost");
    o.value("QUIC");
    o.value("TCP");
    o.value("UDP");

    o = s2.option(form.ListValue, "doh_provider", "DoH Provider");
    o.modalonly = true;
    o.depends("dns_server_type", "DoH");
    o.value("8.8.8.8", "Google");
    o.value("1.1.1.1", "Cloudflare");
    o.value("dns.adguard-dns.com", "adGuard");

    o = s2.option(form.Value, "address", _("Address"));
    o.datatype = "host";
    o.depends({ dns_server_type: /\b(QUIC|TCP|UDP)\b/i });

    o = s2.option(form.Value, "port", _("Port"));
    o.depends({ dns_server_type: /\b(QUIC|TCP|UDP)\b/i });
    o.modalonly = true;
    o.datatype = "port";
    o.placeholder = "53";

    o = s2.option(
      form.Flag,
      "local_mode",
      _("Local Mode"),
      _("DNS Query through <code>Freedom</code> outbound")
    );
    o.modalonly = true;
    o.depends({ dns_server_type: /\b(DoH|TCP|QUIC)\b/i });

    o = s2.option(form.DynamicList, "domains", _("Domains"));
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      }
      return v2ray.v2rayValidation("domainrule", Value);
    };
    o.modalonly = true;

    o = s2.option(form.DynamicList, "expect_ips", _("Expect IPs"));
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      }
      return v2ray.v2rayValidation("iprule", Value);
    };
    o.modalonly = true;

    o = s2.option(form.ListValue, "skip_fallback", _("Skip Fallback"));
    o.modalonly = true;
    o.value("");
    o.value("0", _("False"));
    o.value("1", _("True"));

    o = s2.option(form.Value, "client_ip", _("Client IP"));
    o.modalonly = true;
    o.datatype = "ipaddr";

    return m.render();
  },
});
