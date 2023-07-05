/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */

"use strict";

"require form";
"require fs";
// "require request";
"require rpc";
"require uci";
"require ui";
"require v2ray";
// "require view";

"require tools/widgets as widgets";

"require view/v2ray/include/custom as custom";
"require view/v2ray/tools/converters as converters";

const gfwlistUrls = {
  github:
    "https://raw.githubusercontent.com/gfwlist/gfwlist/master/gfwlist.txt",
  gitlab: "https://gitlab.com/gfwlist/gfwlist/raw/master/gfwlist.txt",
  pagure: "https://pagure.io/gfwlist/raw/master/f/gfwlist.txt",
  bitbucket: "https://bitbucket.org/gfwlist/gfwlist/raw/HEAD/gfwlist.txt",
};

const apnicDelegatedUrls = {
  apnic: "https://ftp.apnic.net/stats/apnic/delegated-apnic-latest",
  arin: "https://ftp.arin.net/pub/stats/apnic/delegated-apnic-latest",
  ripe: "https://ftp.ripe.net/pub/stats/apnic/delegated-apnic-latest",
  iana: "https://ftp.iana.org/pub/mirror/rirstats/apnic/delegated-apnic-latest",
};

// @ts-ignore
return L.view.extend<[SectionItem[], SectionItem[], string]>({
  handleListUpdate(ev: MouseEvent, section_id: string, listtype: string) {
    const hideModal = function () {
      ui.hideModal();

      window.location.reload();
    };

    switch (listtype) {
      case "gfwlist": {
        const gfwlistMirror =
          uci.get<string>("v2ray", section_id, "gfwlist_mirror") || "github";
        const url = gfwlistUrls[gfwlistMirror];

        return fs
          .exec("/usr/share/v2ray/update_lists.sh", [listtype, url])
          .then(
            L.bind(function (res) {
              if (res.code === 0) {
                ui.showModal(_("List Update"), [
                  E("p", _("GFWList updated.")),
                  E(
                    "div",
                    { class: "right" },
                    E("button", { class: "btn", click: hideModal }, _("OK"))
                  ),
                ]);
              } else {
                ui.showModal(_("Update Failed"), [
                  E("p", "Updated failed with error code:%d".format(res.code)),
                  E("pre", {}, res.stderr ? res.stderr : ""),
                  E(
                    "div",
                    { class: "right" },
                    E("button", { class: "btn", click: ui.hideModal }, _("OK"))
                  ),
                ]);
              }
            }),
            this,
            ev.target
          )
          .catch(function () {});
      }
      case "chnroute":
      case "chnroute6": {
        const delegatedMirror =
          uci.get<string>("v2ray", section_id, "apnic_delegated_mirror") ||
          "apnic";
        const url = apnicDelegatedUrls[delegatedMirror];
        return fs
          .exec("/usr/share/v2ray/update_lists.sh", [listtype, url])
          .then(
            L.bind(function (res) {
              if (res.code === 0) {
                ui.showModal(_("List Update"), [
                  E("p", _("China Route Lists updated.")),
                  E(
                    "div",
                    { class: "right" },
                    E("button", { class: "btn", click: hideModal }, _("OK"))
                  ),
                ]);
              } else {
                ui.showModal(_("Update Failed"), [
                  E("p", "Updated failed with error code:%d".format(res.code)),
                  E("pre", {}, res.stderr ? res.stderr : ""),
                  E(
                    "div",
                    { class: "right" },
                    E("button", { class: "btn", click: ui.hideModal }, _("OK"))
                  ),
                ]);
              }
            }),
            this,
            ev.target
          )
          .catch(function () {});
      }

      default: {
        ui.addNotification(null, _("Unexpected error."));
      }
    }
  },
  load: function () {
    return Promise.all([v2ray.getDokodemoDoorPorts(), v2ray.getCore()]);
  },
  render: function ([dokodemoDoorPorts = [], core = ""] = []) {
    const m = new form.Map(
      "v2ray",
      "%s - %s".format(core, _("Transparent Proxy"))
    );

    const s = m.section(
      form.NamedSection,
      "main_transparent_proxy",
      "transparent_proxy"
    );

    let o;

    o = s.option(
      form.Value,
      "redirect_port",
      _("Redirect port"),
      _("Enable transparent proxy on Dokodemo-door port.")
    );
    o.value("", _("None"));
    for (const p of dokodemoDoorPorts) {
      o.value(p.value, p.caption);
    }
    o.datatype = "port";

    o = s.option(
      widgets.NetworkSelect,
      "lan_ifaces",
      _("LAN interfaces"),
      _("Enable proxy on selected interfaces.")
    );
    o.multiple = true;
    o.nocreate = true;
    o.filter = function (section_id: string, value: string) {
      return value.indexOf("wan") < 0;
    };
    o.rmempty = false;

    o = s.option(
      form.Flag,
      "use_tproxy",
      _("Use TProxy"),
      _("Setup redirect rules with TProxy.")
    );

    o = s.option(form.Flag, "ipv6_tproxy", _("Proxy IPv6"));
    o = s.option(
      form.Flag,
      "only_privileged_ports",
      _("Only privileged ports"),
      _("Only redirect traffic on ports below 1024.")
    );

    o = s.option(
      form.Flag,
      "redirect_udp",
      _("Redirect UDP"),
      "%s %s.".format(_("Redirect UDP traffic to"), core)
    );

    o = s.option(
      form.Flag,
      "redirect_dns",
      _("Redirect DNS"),
      "%s %s.".format(_("Redirect DNS queries to"), core)
    );
    o.depends("redirect_udp", "");
    o.depends("redirect_udp", "0");

    o = s.option(
      form.DynamicList,
      "excluded_tcp_port",
      _("Excluded TCP Source Port(s)"),
      _(
        "Outgoing TCP Traffic from the given port(s) will be ignored by Transparent Proxy."
      )
    );
    o.datatype = "portrange";
    o.rmempty = true;

    o = s.option(
      form.DynamicList,
      "excluded_udp_port",
      _("Excluded UDP Source Port(s)"),
      _(
        "Outgoing UDP Traffic from the given port(s) will be ignored by Transparent Proxy."
      )
    );
    o.depends("redirect_udp", "1");
    o.datatype = "portrange";
    o.rmempty = true;

    o = s.option(
      form.ListValue,
      "proxy_mode",
      _("Proxy mode"),
      "%s %s.".format(
        _("Apply firewall rules to Pre-filter traffic before sending to"),
        core
      )
    );
    o.value("default", _("Default"));
    o.value("cn_direct", _("CN Direct"));
    o.value("cn_proxy", _("CN Proxy"));
    o.value("gfwlist_proxy", _("GFWList Proxy"));

    o = s.option(
      form.ListValue,
      "apnic_delegated_mirror",
      _("APNIC delegated mirror")
    );
    o.value("apnic", "APNIC");
    o.value("arin", "ARIN");
    o.value("ripe", "RIPE");
    o.value("iana", "IANA");

    o = s.option(custom.ListStatusValue, "_chnroutelist", _("CHNRoute"));
    o.listtype = "chnroute";
    o.btntitle = _("Update");
    o.btnstyle = "apply";
    o.onupdate = L.bind(this.handleListUpdate, this);

    o = s.option(form.ListValue, "gfwlist_mirror", _("GFWList mirror"));
    o.value("github", "GitHub");
    o.value("gitlab", "GitLab");
    o.value("bitbucket", "Bitbucket");
    o.value("pagure", "Pagure");

    o = s.option(custom.ListStatusValue, "_gfwlist", _("GFWList"));
    o.listtype = "gfwlist";
    o.btntitle = _("Update");
    o.btnstyle = "apply";
    o.onupdate = L.bind(this.handleListUpdate, this);

    o = s.option(
      custom.TextValue,
      "_proxy_list",
      _("Extra proxy list"),
      _(
        "One address per line. Allow types: DOMAIN, IP, CIDR. eg: %s, %s, %s"
      ).format("www.google.com", "1.1.1.1", "192.168.0.0/16")
    );
    o.wrap = "off";
    o.rows = 5;
    o.datatype = "string";
    o.filepath = "/etc/v2ray/proxylist.txt";

    o = s.option(
      custom.TextValue,
      "_direct_list",
      _("Extra direct list"),
      _(
        "One address per line. Allow types: DOMAIN, IP, CIDR. eg: %s, %s, %s"
      ).format("www.google.com", "1.1.1.1", "192.168.0.0/16")
    );
    o.wrap = "off";
    o.rows = 5;
    o.datatype = "string";
    o.filepath = "/etc/v2ray/directlist.txt";

    o = s.option(
      form.Value,
      "proxy_list_dns",
      _("Proxy list DNS"),
      _(
        "DNS used for domains in proxy list, format: <code>ip#port</code>. eg: %s"
      ).format("1.1.1.1#53")
    );

    o = s.option(
      form.Value,
      "direct_list_dns",
      _("Direct list DNS"),
      _(
        "DNS used for domains in direct list, format: <code>ip#port</code>. eg: %s"
      ).format("114.114.114.114#53")
    );

    o = s.option(
      custom.TextValue,
      "_src_direct_list",
      _("Local devices direct outbound list"),
      _("One address per line. Allow types: IP, CIDR. eg: %s, %s").format(
        "192.168.0.19",
        "192.168.0.0/16"
      )
    );
    o.wrap = "off";
    o.rows = 3;
    o.datatype = "string";
    o.filepath = "/etc/v2ray/srcdirectlist.txt";

    return m.render();
  },
});
