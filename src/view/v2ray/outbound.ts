/**
 * @license
 * Copyright 2020 Xingwang Liao <kuoruan@gmail.com>
 *
 * Licensed to the public under the MIT License.
 */

"use strict";

"require form";
"require uci";
"require v2ray";
// "require view";
"require ui";
"require fs";
"require validation";

"require view/v2ray/tools/converters as converters";

// @ts-ignore
return L.view.extend<[string[], SectionItem[][][][][][], tlsItem[], string]>({
  handleImportSave: function (val: string) {
    const links = val.split(/\r?\n/);

    let linksCount = 0;
    for (const link of links) {
      let vmess;
      if (
        !link ||
        !(vmess = converters.vmessLinkToVmess(link)) ||
        vmess.v !== "2"
      ) {
        continue;
      }

      const sid = uci.add("v2ray", "outbound");
      if (!sid) continue;

      const address = vmess.add || "0.0.0.0";
      const port = vmess.port || "0";
      const tls = vmess.tls || "";

      const network = vmess.net || "";
      const headerType = vmess.type || "";
      const path = vmess.path || "";

      const alias = vmess.ps || "%s:%s".format(address, port);

      uci.set("v2ray", sid, "alias", alias);
      uci.set("v2ray", sid, "protocol", "vmess");
      uci.set("v2ray", sid, "s_vmess_address", address);
      uci.set("v2ray", sid, "s_vmess_port", port);
      uci.set("v2ray", sid, "s_vmess_user_id", vmess.id || "");
      uci.set("v2ray", sid, "s_vmess_user_alter_id", vmess.aid || "");
      uci.set("v2ray", sid, "ss_security", tls);

      let hosts: string[] = [];
      if (vmess.host) {
        hosts = vmess.host.split(",");
      }

      switch (network) {
        case "tcp": {
          uci.set("v2ray", sid, "ss_network", "tcp");
          uci.set("v2ray", sid, "ss_tcp_header_type", headerType);

          if (headerType === "http" && hosts.length > 0) {
            uci.set("v2ray", sid, "ss_tcp_header_request_headers", [
              "Host=%s".format(hosts[0]),
            ]);

            if (tls === "tls") {
              uci.set("v2ray", sid, "ss_tls_server_name", hosts[0]);
            }
          }
          break;
        }

        case "kcp":
        case "mkcp": {
          uci.set("v2ray", sid, "ss_network", "kcp");
          uci.set("v2ray", sid, "ss_kcp_header_type", headerType);
          break;
        }

        case "ws": {
          uci.set("v2ray", sid, "ss_network", "ws");
          uci.set("v2ray", sid, "ss_websocket_path", path);
          break;
        }

        case "http":
        case "h2": {
          uci.set("v2ray", sid, "ss_network", "http");
          uci.set("v2ray", sid, "ss_http_path", path);

          if (hosts.length > 0) {
            uci.set("v2ray", sid, "ss_http_host", hosts);
            uci.set("v2ray", sid, "ss_tls_server_name", hosts[0]);
          }
          break;
        }

        case "quic": {
          uci.set("v2ray", sid, "ss_network", "quic");
          uci.set("v2ray", sid, "ss_quic_header_type", headerType);
          uci.set("v2ray", sid, "ss_quic_key", path);

          if (hosts.length > 0) {
            uci.set("v2ray", sid, "ss_quic_security", hosts[0]);

            if (tls === "tls") {
              uci.set("v2ray", sid, "ss_tls_server_name", hosts[0]);
            }
          }

          break;
        }

        default: {
          uci.remove("v2ray", sid);
          continue;
        }
      }

      linksCount++;
    }

    if (linksCount > 0) {
      return uci.save().then(function () {
        ui.showModal(_("Outbound Import"), [
          E("p", {}, _("Imported %d links.").format(linksCount)),
          E(
            "div",
            { class: "right" },
            E(
              "button",
              {
                class: "btn",
                click: ui.createHandlerFn(this, function () {
                  return uci.apply().then(function () {
                    ui.hideModal();

                    window.location.reload();
                  });
                }),
              },
              _("OK")
            )
          ),
        ]);
      });
    } else {
      ui.showModal(_("Outbound Import"), [
        E("p", {}, _("No links imported.")),
        E(
          "div",
          { class: "right" },
          E(
            "button",
            {
              class: "btn",
              click: ui.hideModal,
            },
            _("OK")
          )
        ),
      ]);
    }
  },
  handleImportClick: function () {
    const textarea = new ui.Textarea("", {
      rows: 10,
      placeholder: _("You can add multiple links at once, one link per line."),
      validate: function (val: string) {
        if (!val) {
          return _("Empty field.");
        }

        if (!/^(vmess:\/\/[a-zA-Z0-9/+=]+\s*)+$/i.test(val)) {
          return _("Invalid links.");
        }

        return true;
      },
    });

    ui.showModal(_("Import Vmess Links"), [
      E("div", {}, [
        E(
          "p",
          {},
          _("Allowed link format: <code>%s</code>").format("vmess://xxxxx")
        ),
        textarea.render(),
      ]),
      E("div", { class: "right" }, [
        E(
          "button",
          {
            class: "btn",
            click: ui.hideModal,
          },
          _("Dismiss")
        ),
        " ",
        E(
          "button",
          {
            class: "cbi-button cbi-button-positive important",
            click: ui.createHandlerFn(
              this,
              function (area: ui.Textarea) {
                area.triggerValidation();

                let val: string;
                if (
                  !area.isValid() ||
                  !(val = area.getValue()) ||
                  !(val = val.trim())
                ) {
                  return;
                }

                return this.handleImportSave(val);
              },
              textarea
            ),
          },
          _("Save")
        ),
      ]),
    ]);
  },
  load: function () {
    return uci.load("v2ray").then(function () {
      const tcp_congestion: string[] = fs
        .read("/proc/sys/net/ipv4/tcp_available_congestion_control")
        .then((result) => {
          return result.split(" ");
        });
      return Promise.all([
        v2ray.getLocalIPs(),
        v2ray.getSections("inbound", "alias"),
        v2ray.getSections("inbound", "tag"),
        v2ray.getSections("outbound", "alias"),
        v2ray.getSections("outbound", "tag"),
        v2ray.getSections("reverse", "bridges"),
        v2ray.getSections("reverse", "portals"),
        v2ray.getXtlsSecurity(),
        v2ray.getCore(),
        tcp_congestion,
      ]);
    });
  },
  render: function ([
    localIPs = [],
    inbound_alias = [],
    inbound_tag = [],
    outbound_alias = [],
    outbound_tag = [],
    reverse_bridges = [],
    reverse_portals = [],
    xtls_security = [],
    core = "",
    tcp_congestion = [],
  ] = []) {
    const m = new form.Map("v2ray", "%s - %s".format(core, _("Outbound")));

    const s = m.section(form.GridSection, "outbound");
    s.addremove = true;
    s.sortable = true;
    s.sectiontitle = function (section_name: string) {
      const section_title = uci.get("v2ray", section_name, "alias");
      return section_title;
    };
    s.modaltitle = function (section_id: string) {
      const alias = uci.get("v2ray", section_id, "alias");
      return `${_("Outbound")} > ${alias ?? _("Add")}`;
    };
    s.nodescriptions = true;

    s.tab("general", _("General Settings"));
    s.tab("stream", _("Stream Settings"));
    s.tab("mux", _("Mux Settings"));

    let o;

    /** General Settings **/
    o = s.taboption("general", form.Value, "alias", _("Alias"));
    o.rmempty = false;
    o.modalonly = true;

    o = s.taboption("general", form.Value, "tag", _("Tag"));
    o.rmempty = false;

    o = s.taboption("general", form.Value, "send_through", _("Send through"));
    o.datatype = "ipaddr";
    for (const IP of localIPs) {
      o.value(IP);
    }

    o = s.taboption("general", form.ListValue, "protocol", _("Protocol"));
    o.value("blackhole", "Blackhole");
    o.value("dns", "DNS");
    o.value("freedom", "Freedom");
    o.value("http", "HTTP/2");
    o.value("loopback");
    o.value("mtproto", "MTProto");
    o.value("shadowsocks", "Shadowsocks");
    o.value("socks", "Socks");
    o.value("trojan", "Trojan");
    o.value("vless", "VLESS");
    o.value("vmess", "VMess");
    o.value("wireguard", "WireGuard");

    // Settings Blackhole
    o = s.taboption(
      "general",
      form.ListValue,
      "s_blackhole_reponse_type",
      "%s - %s".format("Blackhole", _("Response type"))
    );
    o.modalonly = true;
    o.depends("protocol", "blackhole");
    o.value("");
    o.value("none", _("None"));
    o.value("http", "HTTP");

    // Settings DNS
    o = s.taboption(
      "general",
      form.ListValue,
      "s_dns_network",
      "%s - %s".format("DNS", _("Network"))
    );
    o.modalonly = true;
    o.depends("protocol", "dns");
    o.value("");
    o.value("tcp", "TCP");
    o.value("udp", "UDP");

    o = s.taboption(
      "general",
      form.Value,
      "s_dns_address",
      "%s - %s".format("DNS", _("Address"))
    );
    o.modalonly = true;
    o.depends("protocol", "dns");

    o = s.taboption(
      "general",
      form.Value,
      "s_dns_port",
      "%s - %s".format("DNS", _("Port"))
    );
    o.modalonly = true;
    o.depends("protocol", "dns");
    o.datatype = "port";

    o = s.taboption(
      "general",
      form.ListValue,
      "s_dns_non_ip_query",
      _("Non IP Queries")
    );
    o.modalonly = true;
    o.depends("protocol", "dns");
    o.value("", _("Default"));
    o.value("drop", _("Drop"));
    o.value("skip", _("Skip"));

    // Settings Freedom
    o = s.taboption(
      "general",
      form.ListValue,
      "s_freedom_domain_strategy",
      "%s - %s".format("Freedom", _("Domain strategy"))
    );
    o.modalonly = true;
    o.depends("protocol", "freedom");
    o.value("");
    o.value("AsIs");
    o.value("UseIP");
    o.value("UseIPv4");
    o.value("UseIPv6");

    o = s.taboption(
      "general",
      form.Value,
      "s_freedom_redirect",
      "%s - %s".format("Freedom", _("Redirect"))
    );
    o.modalonly = true;
    o.depends("protocol", "freedom");

    o = s.taboption(
      "general",
      form.Flag,
      "s_freedom_fragment_enabled",
      "%s - %s".format(_("TCP Fragmentize"), _("Enabled"))
    );
    o.modalonly = true;
    o.depends("protocol", "freedom");
    o.rmempty = true;
    o.disabled = "0";
    o.enabled = "1";

    o = s.taboption(
      "general",
      form.Value,
      "s_freedom_fragment_length",
      "%s - %s".format(_("Fragment"), _("Length"))
    );
    o.modalonly = true;
    o.validate = function (sid: string, value: string): boolean | string {
      if (!value) {
        return true;
      }
      return v2ray.v2rayValidation("fragment-length", value);
    };
    o.rmempty = true;
    o.depends("s_freedom_fragment_enabled", "1");

    o = s.taboption(
      "general",
      form.Value,
      "s_freedom_fragment_interval",
      "%s - %s".format(_("Fragment"), _("Interval"))
    );
    o.modalonly = true;
    o.validate = function (sid: string, value: string): boolean | string {
      if (!value) {
        return true;
      }
      return v2ray.v2rayValidation("fragment-interval", value);
    };
    o.rmempty = true;
    o.depends("s_freedom_fragment_enabled", "1");

    o = s.taboption(
      "general",
      form.Value,
      "s_freedom_fragment_packets",
      "%s - %s".format(_("Fragment"), _("Packets"))
    );
    o.modalonly = true;
    o.validate = function (sid: string, value: string): boolean | string {
      if (!value) {
        return true;
      }
      return v2ray.v2rayValidation("fragment-packets", value);
    };
    o.rmempty = true;
    o.depends("s_freedom_fragment_enabled", "1");
    o.value("tlshello", _("TLS Hello Packet"));
    o.value("", _("All Packets"));

    o = s.taboption(
      "general",
      form.Value,
      "s_freedom_user_level",
      "%s - %s".format("Freedom", _("User level"))
    );
    o.modalonly = true;
    o.depends("protocol", "freedom");
    o.datatype = "uinteger";

    // Settings - HTTP
    o = s.taboption(
      "general",
      form.Value,
      "s_http_address",
      "%s - %s".format("HTTP", _("Server address"))
    );
    o.modalonly = true;
    o.depends("protocol", "http");
    o.datatype = "host";

    o = s.taboption(
      "general",
      form.Value,
      "s_http_server_port",
      "%s - %s".format("HTTP", _("Server port"))
    );
    o.modalonly = true;
    o.depends("protocol", "http");
    o.datatype = "port";

    o = s.taboption(
      "general",
      form.Value,
      "s_http_account_user",
      "%s - %s".format("HTTP", _("User"))
    );
    o.modalonly = true;
    o.depends("protocol", "http");

    o = s.taboption(
      "general",
      form.Value,
      "s_http_account_pass",
      "%s - %s".format("HTTP", _("Password"))
    );
    o.modalonly = true;
    o.depends("protocol", "http");
    o.password = true;

    o = s.taboption(
      "general",
      form.DynamicList,
      "s_http_headers",
      "%s - %s".format("HTTP", _("Headers")),
      _("Custom HTTP Headers,format: <code>header=value</code>")
    );
    o.modalonly = true;
    o.depends("protocol", "http");
    o.rmempty = true;

    // Settings - Loopback
    o = s.taboption(
      "general",
      form.ListValue,
      "s_loopback_inboundtag",
      "%s - %s".format("Loopback", _("Inbound Tag"))
    );
    o.modalonly = true;
    o.depends("protocol", "loopback");
    o.value("", _("None"));
    for (let i = 0; i < inbound_alias.length; i++) {
      o.value(
        inbound_tag[i].caption,
        `${inbound_alias[i].caption}(${inbound_tag[i].caption})`
      );
    }
    for (const rb of reverse_bridges) {
      const stmp = String(rb.caption);
      const cap = stmp.split(",");
      for (const rba of cap) {
        o.value(rba.substring(0, rba.indexOf("|")), rba);
      }
    }

    // Settings - Shadowsocks
    o = s.taboption(
      "general",
      form.Value,
      "s_shadowsocks_email",
      "%s - %s".format("Shadowsocks", _("Email"))
    );
    o.modalonly = true;
    o.depends("protocol", "shadowsocks");

    o = s.taboption(
      "general",
      form.Value,
      "s_shadowsocks_address",
      "%s - %s".format("Shadowsocks", _("Address"))
    );
    o.modalonly = true;
    o.depends("protocol", "shadowsocks");
    o.datatype = "host";

    o = s.taboption(
      "general",
      form.Value,
      "s_shadowsocks_port",
      "%s - %s".format("Shadowsocks", _("Port"))
    );
    o.modalonly = true;
    o.depends("protocol", "shadowsocks");
    o.datatype = "port";

    o = s.taboption(
      "general",
      form.ListValue,
      "s_shadowsocks_method",
      "%s - %s".format("Shadowsocks", _("Method"))
    );
    o.modalonly = true;
    o.depends("protocol", "shadowsocks");
    o.value("");
    o.value("aes-256-cfb");
    o.value("aes-128-cfb");
    o.value("chacha20");
    o.value("chacha20-ietf");
    o.value("aes-256-gcm");
    o.value("aes-128-gcm");
    o.value("chacha20-poly1305");
    o.value("chacha20-ietf-poly1305");

    o = s.taboption(
      "general",
      form.Value,
      "s_shadowsocks_password",
      "%s - %s".format("Shadowsocks", _("Password"))
    );
    o.modalonly = true;
    o.depends("protocol", "shadowsocks");
    o.password = true;

    o = s.taboption(
      "general",
      form.Value,
      "s_shadowsocks_level",
      "%s - %s".format("Shadowsocks", _("User level"))
    );
    o.modalonly = true;
    o.depends("protocol", "shadowsocks");
    o.datatype = "uinteger";

    o = s.taboption(
      "general",
      form.Flag,
      "s_shadowsocks_ota",
      "%s - %s".format("Shadowsocks", _("OTA"))
    );
    o.modalonly = true;
    o.depends("protocol", "shadowsocks");

    // Settings - Socks
    o = s.taboption(
      "general",
      form.Value,
      "s_socks_server_address",
      "%s - %s".format("Socks", _("Server address"))
    );
    o.modalonly = true;
    o.depends("protocol", "socks");
    o.datatype = "host";

    o = s.taboption(
      "general",
      form.Value,
      "s_socks_server_port",
      "%s - %s".format("Socks", _("Server port"))
    );
    o.modalonly = true;
    o.depends("protocol", "socks");
    o.datatype = "port";

    o = s.taboption(
      "general",
      form.Value,
      "s_socks_account_user",
      "%s - %s".format("Socks", _("User"))
    );
    o.modalonly = true;
    o.depends("protocol", "socks");

    o = s.taboption(
      "general",
      form.Value,
      "s_socks_account_pass",
      "%s - %s".format("Socks", _("Password"))
    );
    o.modalonly = true;
    o.depends("protocol", "socks");
    o.password = true;

    o = s.taboption(
      "general",
      form.Value,
      "s_socks_user_level",
      "%s - %s".format("Socks", _("User level"))
    );
    o.modalonly = true;
    o.depends("protocol", "socks");
    o.datatype = "uinteger";

    // Settings - Trojan
    o = s.taboption(
      "general",
      form.Value,
      "s_trojan_address",
      "%s - %s".format("Trojan", _("Address"))
    );
    o.depends("protocol", "trojan");
    o.modalonly = true;
    o.datatype = "host";

    o = s.taboption(
      "general",
      form.Value,
      "s_trojan_port",
      "%s - %s".format("Trojan", _("Port"))
    );
    o.depends("protocol", "trojan");
    o.modalonly = true;
    o.datatype = "port";

    o = s.taboption(
      "general",
      form.Value,
      "s_trojan_password",
      "%s - %s".format("Trojan", _("Password"))
    );
    o.depends("protocol", "trojan");
    o.modalonly = true;

    // Settings - VLESS
    o = s.taboption(
      "general",
      form.Value,
      "s_vless_address",
      "%s - %s".format("VLESS", _("Address"))
    );
    o.depends("protocol", "vless");
    o.modalonly = true;
    o.datatype = "host";

    o = s.taboption(
      "general",
      form.Value,
      "s_vless_port",
      "%s - %s".format("VLESS", _("Port"))
    );
    o.depends("protocol", "vless");
    o.modalonly = true;
    o.datatype = "port";

    o = s.taboption(
      "general",
      form.Value,
      "s_vless_user_id",
      "%s - %s".format("VLESS", _("User ID"))
    );
    o.modalonly = true;
    o.depends("protocol", "vless");

    o = s.taboption(
      "general",
      form.Value,
      "s_vless_user_level",
      "%s - %s".format("VLESS", _("User Level"))
    );
    o.modalonly = true;
    o.depends("protocol", "vless");
    o.datatype = "and(uinteger, max(10))";

    o = s.taboption(
      "general",
      form.ListValue,
      "s_vless_user_encryption",
      "%s - %s".format("VLESS", _("Encryption"))
    );
    o.modalonly = true;
    o.depends("protocol", "vless");
    o.value("none");

    // Settings - VMess
    o = s.taboption(
      "general",
      form.Value,
      "s_vmess_address",
      "%s - %s".format("VMess", _("Address"))
    );
    o.modalonly = true;
    o.depends("protocol", "vmess");
    o.datatype = "host";

    o = s.taboption(
      "general",
      form.Value,
      "s_vmess_port",
      "%s - %s".format("VMess", _("Port"))
    );
    o.modalonly = true;
    o.depends("protocol", "vmess");
    o.datatype = "port";

    o = s.taboption(
      "general",
      form.Value,
      "s_vmess_user_id",
      "%s - %s".format("VMess", _("User ID"))
    );
    o.modalonly = true;
    o.depends("protocol", "vmess");

    o = s.taboption(
      "general",
      form.Value,
      "s_vmess_user_alter_id",
      "%s - %s".format("VMess", _("Alter ID"))
    );
    o.modalonly = true;
    o.depends("protocol", "vmess");
    o.datatype = "and(uinteger, max(65535))";

    o = s.taboption(
      "general",
      form.ListValue,
      "s_vmess_user_security",
      "%s - %s".format("VMess", _("Security"))
    );
    o.modalonly = true;
    o.depends("protocol", "vmess");
    o.value("");
    o.value("auto", _("Auto"));
    o.value("aes-128-gcm");
    o.value("chacha20-poly1305");
    o.value("none", _("None"));

    o = s.taboption(
      "general",
      form.Value,
      "s_vmess_user_level",
      "%s - %s".format("VMess", _("User level"))
    );
    o.modalonly = true;
    o.depends("protocol", "vmess");
    o.datatype = "uinteger";

    // Settings WireGuard

    o = s.taboption(
      "general",
      form.Value,
      "s_wireguard_secret_key",
      _("Private Key")
    );
    o.depends("protocol", "wireguard");
    o.validate = function (sid: string, value: string): boolean | string {
      return v2ray.v2rayValidation("wg-keys", value);
    };
    o.modalonly = true;
    o.rmempty = false;

    o = s.taboption(
      "general",
      form.DynamicList,
      "s_wireguard_address",
      _("Address")
    );
    o.depends("protocol", "wireguard");
    o.modalonly = true;
    o.optional = true;
    o.datatype = "or(ipaddr, cidr)";

    o = s.taboption(
      "general",
      form.Value,
      "s_wireguard_endpoint",
      _("Endpoint")
    );
    o.depends("protocol", "wireguard");
    o.rmempty = false;
    o.modalonly = true;
    o.datatype = "or(hostport(0), ipaddrport(1))";
    o.placeholder = "[2606:4700:d0::a29f:c001]:2408";

    o = s.taboption(
      "general",
      form.Value,
      "s_wireguard_public_key",
      _("Public Key")
    );
    o.depends("protocol", "wireguard");
    o.validate = function (sid: string, value: string) {
      return v2ray.v2rayValidation("wg-keys", value);
    };
    o.rmempty = false;
    o.modalonly = true;

    o = s.taboption(
      "general",
      form.Value,
      "s_wireguard_preshared_key",
      _("Pre-Shared Key")
    );
    o.depends("protocol", "wireguard");
    o.rmempty = true;
    o.modalonly = true;
    o.optional = true;

    o = s.taboption(
      "general",
      form.DynamicList,
      "s_wireguard_allowed_ips",
      _("Allowed IPs")
    );
    o.depends("protocol", "wireguard");
    o.rmempty = true;
    o.modalonly = true;
    o.datatype = "or(ipaddr, cidr)";
    o.optional = true;

    o = s.taboption(
      "general",
      form.Value,
      "s_wireguard_keep_alive",
      _("Keep Alive")
    );
    o.depends("protocol", "wireguard");
    o.rmempty = true;
    o.modalonly = true;
    o.datatype = "uinteger";
    o.optional = true;

    o = s.taboption("general", form.Value, "s_wireguard_mtu", _("MTU"));
    o.depends("protocol", "wireguard");
    o.rmempty = true;
    o.modalonly = true;
    o.datatype = "and(uinteger, range(1280, 1420))";
    o.optional = true;

    o = s.taboption(
      "general",
      form.Value,
      "s_wireguard_reserved_bytes",
      _("Reserved Bytes")
    );
    o.depends("protocol", "wireguard");
    o.modalonly = true;
    o.optional = true;
    o.validate = function (sid: string, value: string): boolean | string {
      if (!value) {
        return true;
      }
      return v2ray.v2rayValidation("wg-reserved", value);
    };
    o.rmempty = true;
    o.placeholder = "0,123,255";
    o.optional = true;

    /** Stream Settings **/
    o = s.taboption("stream", form.ListValue, "ss_network", _("Network"));
    o.depends({ protocol: /\b(http|trojan|vless|vmess)\b/ });
    o.value("");
    o.value("grpc", "gRPC");
    o.value("tcp", "TCP");
    o.value("kcp", "mKCP");
    o.value("ws", "WebSocket");
    o.value("h2", "HTTP/2");
    o.value("domainsocket", "Domain Socket");
    o.value("quic", "QUIC");

    o = s.taboption("stream", form.ListValue, "ss_security", _("Security"));
    o.depends({ protocol: /\b(http|trojan|vless|vmess)\b/ });
    o.modalonly = true;
    o.rmempty = false;
    o.value("none", _("None"));
    o.value("tls", "TLS");
    for (const x of xtls_security) {
      for (const xs of x.security) {
        o.value(
          xs.substring(0, xs.indexOf("|")),
          xs.substring(xs.indexOf("|") + 1)
        );
      }
    }

    o = s.taboption("stream", form.ListValue, "s_xtls_flow", _("Flow"));
    o.modalonly = true;
    o.rmempty = true;
    o.optional = true;
    o.depends({
      protocol: "vless",
      ss_network: /\b(tcp|kcp|domainsocket)\b/,
      reality_check: "0",
      ss_security: "xtls",
    });
    o.depends({
      protocol: "vless",
      ss_network: /\b(tcp|kcp|domainsocket|ws|grpc)\b/,
      reality_check: "1",
      ss_security: "tls",
    });
    o.depends({
      protocol: "vless",
      ss_network: /\b(tcp|kcp|domainsocket|ws|grpc)\b/,
      reality_check: "1",
      ss_security: "reality",
    });
    o.value("", "None");
    for (const xs of xtls_security) {
      for (const xf of xs.flow) {
        o.value(xf);
      }
    }

    // Stream Settings - TLS
    o = s.taboption(
      "stream",
      form.Value,
      "ss_tls_server_name",
      _("Server name")
    );
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });
    o.validate = function (sid: string, Value: string): boolean | string {
      return v2ray.v2rayValidation("sni", Value, sid);
    };

    o = s.taboption("stream", form.MultiValue, "ss_tls_alpn", "ALPN");
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });
    o.value("h2");
    o.value("http/1.1");

    o = s.taboption(
      "stream",
      form.Flag,
      "ss_tls_allow_insecure",
      _("Allow insecure")
    );
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });

    o = s.taboption(
      "stream",
      form.Flag,
      "ss_tls_allow_insecure_ciphers",
      _("Allow insecure ciphers")
    );
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });

    o = s.taboption(
      "stream",
      form.Flag,
      "ss_tls_disable_system_root",
      _("Disable system root")
    );
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_tls_cert_usage",
      _("Certificate usage")
    );
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });
    o.value("");
    o.value("encipherment");
    o.value("verify");
    o.value("issue");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_tls_cert_fiile",
      _("Certificate file")
    );
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });

    o = s.taboption("stream", form.Value, "ss_tls_key_file", _("Key file"));
    o.modalonly = true;
    o.depends({ ss_security: /tls$/ });

    // Stream Settings - REALITY
    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_reality_show",
      "%s - %s".format("Debug", _("Info")),
      _("Show REALITY Debug Info")
    );
    o.modalonly = true;
    o.depends("ss_security", "reality");
    o.value("1", _("Show"));
    o.value("0", _("Hide"));

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_reality_fingerprint",
      _("fingerprint")
    );
    o.modalonly = true;
    o.depends({ ss_security: /\b(reality|tls|xtls)\b/ });
    o.value("", "none");
    o.value("360");
    o.value("chrome");
    o.value("edge");
    o.value("firefox");
    o.value("ios");
    o.value("qq");
    o.value("random");
    o.value("randomized");
    o.value("safari");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_reality_server_name",
      _("Server Name")
    );
    o.modalonly = true;
    o.datatype = "hostname";
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      } else {
        return v2ray.v2rayValidation("sni", Value, sid);
      }
    };
    o.depends("ss_security", "reality");
    o.placeholder = "example.com";

    o = s.taboption(
      "stream",
      form.Value,
      "ss_reality_public_key",
      _("Public Key")
    );
    o.modalonly = true;
    o.depends("ss_security", "reality");
    o.datatype = "rangelength(43, 43)";

    o = s.taboption("stream", form.Value, "ss_reality_short_id", _("Short ID"));
    o.modalonly = true;
    o.depends("ss_security", "reality");
    o.datatype = "and(hexstring, maxlength(16))";
    o.rmempty = true;

    o = s.taboption(
      "stream",
      form.Value,
      "ss_reality_spiderx",
      _("Spider Parameters")
    );
    o.modalonly = true;
    o.depends("ss_security", "reality");
    o.rmempty = true;

    // Stream Settings - TCP
    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_tcp_header_type",
      "%s - %s".format("TCP", _("Header type"))
    );
    o.modalonly = true;
    o.depends("ss_network", "tcp");
    o.value("");
    o.value("none", _("None"));
    o.value("http", "HTTP");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_tcp_header_request_version",
      "%s - %s".format("TCP", _("HTTP request version"))
    );
    o.modalonly = true;
    o.depends("ss_tcp_header_type", "http");

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_tcp_header_request_method",
      "%s - %s".format("TCP", _("HTTP request method"))
    );
    o.modalonly = true;
    o.depends("ss_tcp_header_type", "http");
    o.value("");
    o.value("GET");
    o.value("HEAD");
    o.value("POST");
    o.value("DELETE");
    o.value("PUT");
    o.value("PATCH");
    o.value("OPTIONS");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_tcp_header_request_path",
      "%s - %s".format("TCP", _("Request path"))
    );
    o.modalonly = true;
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      }
      return v2ray.v2rayValidation("path", Value);
    };
    o.depends("ss_tcp_header_type", "http");

    o = s.taboption(
      "stream",
      form.DynamicList,
      "ss_tcp_header_request_headers",
      "%s - %s".format("TCP", _("Request headers")),
      _(
        "A list of HTTP headers, format: <code>header=value</code>. eg: %s"
      ).format("Host=www.bing.com")
    );
    o.modalonly = true;
    o.depends("ss_tcp_header_type", "http");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_tcp_header_response_version",
      "%s - %s".format("TCP", _("HTTP response version"))
    );
    o.modalonly = true;
    o.depends("ss_tcp_header_type", "http");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_tcp_header_response_status",
      "%s - %s".format("TCP", _("HTTP response status"))
    );
    o.modalonly = true;
    o.depends("ss_tcp_header_type", "http");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_tcp_header_response_reason",
      "%s - %s".format("TCP", _("HTTP response reason"))
    );
    o.modalonly = true;
    o.depends("ss_tcp_header_type", "http");

    o = s.taboption(
      "stream",
      form.DynamicList,
      "ss_tcp_header_response_headers",
      "%s - %s".format("TCP", _("Response headers")),
      _(
        "A list of HTTP headers, format: <code>header=value</code>. eg: %s"
      ).format("Host=www.bing.com")
    );
    o.modalonly = true;
    o.depends("ss_tcp_header_type", "http");

    // Stream Settings - KCP
    o = s.taboption(
      "stream",
      form.Value,
      "ss_kcp_mtu",
      "%s - %s".format("mKCP", _("Maximum transmission unit (MTU)"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");
    o.datatype = "and(min(576), max(1460))";
    o.placeholder = "1350";

    o = s.taboption(
      "stream",
      form.Value,
      "ss_kcp_tti",
      "%s - %s".format("mKCP", _("Transmission time interval (TTI)"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");
    o.datatype = "and(min(10), max(100))";
    o.placeholder = "50";

    o = s.taboption(
      "stream",
      form.Value,
      "ss_kcp_uplink_capacity",
      "%s - %s".format("mKCP", _("Uplink capacity"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");
    o.datatype = "uinteger";
    o.placeholder = "5";

    o = s.taboption(
      "stream",
      form.Value,
      "ss_kcp_downlink_capacity",
      "%s - %s".format("mKCP", _("Downlink capacity"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");
    o.datatype = "uinteger";
    o.placeholder = "20";

    o = s.taboption(
      "stream",
      form.Flag,
      "ss_kcp_congestion",
      "%s - %s".format("mKCP", _("Congestion enabled"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_kcp_read_buffer_size",
      "%s - %s".format("mKCP", _("Read buffer size"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");
    o.datatype = "uinteger";
    o.placeholder = "2";

    o = s.taboption(
      "stream",
      form.Value,
      "ss_kcp_write_buffer_size",
      "%s - %s".format("mKCP", _("Write buffer size"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");
    o.datatype = "uinteger";
    o.placeholder = "2";

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_kcp_header_type",
      "%s - %s".format("mKCP", _("Header type"))
    );
    o.modalonly = true;
    o.depends("ss_network", "kcp");
    o.value("");
    o.value("none", _("None"));
    o.value("srtp", "SRTP");
    o.value("utp", "uTP");
    o.value("wechat-video", _("Wechat Video"));
    o.value("dtls", "DTLS 1.2");
    o.value("wireguard", "WireGuard");

    // Stream Settings - WebSocket
    o = s.taboption(
      "stream",
      form.Value,
      "ss_websocket_path",
      "%s - %s".format("WebSocket", _("Path"))
    );
    o.modalonly = true;
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      }
      return v2ray.v2rayValidation("path", Value);
    };
    o.depends("ss_network", "ws");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_websocket_headers",
      "%s - %s".format("WebSocket", _("Host"))
    );
    o.modalonly = true;
    o.datatype = "hostname";
    o.validate = function (sid: string, Value: string): boolean | string {
      return v2ray.v2rayValidation("sni", Value, sid);
    };
    o.depends("ss_network", "ws");
    o.rmempty = true;

    // Stream Settings - gRPC

    o = s.taboption(
      "stream",
      form.Value,
      "ss_grpc_service_name",
      "%s %s".format(_("Service"), _("Name"))
    );
    o.modalonly = true;
    o.rmempty = false;
    o.validate = function (sid: string, Value: string): boolean | string {
      return Value.match(/(?![-_])^[a-z0-9-_]+(?<![_-])$/i)
        ? true
        : _("Invalid Service Name");
    };
    o.depends("ss_network", "grpc");
    o.placeholder = "gRPC_Service";

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_grpc_multi_mode",
      "%s %s".format("gRPC", _("Mode"))
    );
    o.modalonly = true;
    o.depends("ss_network", "grpc");
    o.value("0", "gun");
    o.value("1", "Multi");

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_grpc_permit_without_stream",
      _("Health Check")
    );
    o.modalonly = true;
    o.depends("ss_network", "grpc");
    o.value("0", _("Disabled"));
    o.value("1", _("Enabled"));

    o = s.taboption(
      "stream",
      form.Value,
      "ss_grpc_idle_timeout",
      _("Idle Timeout"),
      _("No less than 10 seconds")
    );

    o.modalonly = true;
    o.depends("ss_network", "grpc");
    o.datatype = "and(min(10), uinteger)";
    o.placeholder = "10";

    o = s.taboption(
      "stream",
      form.Value,
      "ss_grpc_health_check_timeout",
      _("Health Check timeout")
    );
    o.modalonly = true;
    o.depends("ss_grpc_permit_without_stream", "true");
    o.datatype = "and(min(10), uinteger)";
    o.placeholder = "20";

    o = s.taboption(
      "stream",
      form.Value,
      "ss_grpc_initial_windows_size",
      _("Initial Windows Size"),
      _(
        "While connecting through Cloudflare CDN</br> set Initial Windows Size greater than <code>65536</code> to disable Dynamic Window mechanism"
      )
    );
    o.modalonly = true;
    o.depends("ss_network", "grpc");
    o.datatype = "uinteger";

    // Stream Settings - HTTP/2
    o = s.taboption(
      "stream",
      form.DynamicList,
      "ss_http_host",
      "%s - %s".format("HTTP/2", _("Host"))
    );
    o.modalonly = true;
    o.datatype = "hostname";
    o.validate = function (sid: string, Value: string): boolean | string {
      if (Value) {
        return v2ray.domainRule(Value, true);
      }
      return "%s: %s".format(_("Expecting"), _("a valid domain name"));
    };
    o.depends("ss_network", "h2");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_http_path",
      "%s - %s".format("HTTP/2", _("Path"))
    );
    o.modalonly = true;
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      }
      return v2ray.v2rayValidation("path", Value);
    };
    o.depends("ss_network", "h2");
    o.placeholder = "/";

    // Stream Settings - Domain Socket
    o = s.taboption(
      "stream",
      form.Value,
      "ss_domainsocket_path",
      "%s - %s".format("Domain Socket", _("Path"))
    );
    o.modalonly = true;
    o.validate = function (sid: string, Value: string): boolean | string {
      if (!Value) {
        return true;
      }
      return v2ray.v2rayValidation("path", Value);
    };
    o.depends("ss_network", "domainsocket");

    // Stream Settings - QUIC
    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_quic_security",
      "%s - %s".format("QUIC", _("Security"))
    );
    o.modalonly = true;
    o.depends("ss_network", "quic");
    o.value("none", _("None"));
    o.value("aes-128-gcm");
    o.value("chacha20-poly1305");

    o = s.taboption(
      "stream",
      form.Value,
      "ss_quic_key",
      "%s - %s".format("QUIC", _("Key"))
    );
    o.modalonly = true;
    o.depends({ ss_quic_security: /\b(aes-128-gcm|chacha20-poly1305)\b/ });
    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_quic_header_type",
      "%s - %s".format("QUIC", _("Header type"))
    );
    o.modalonly = true;
    o.depends("ss_network", "quic");
    o.value("");
    o.value("none", _("None"));
    o.value("srtp", "SRTP");
    o.value("utp", "uTP");
    o.value("wechat-video", _("Wechat Video"));
    o.value("dtls", "DTLS 1.2");
    o.value("wireguard", "WireGuard");

    // Stream Settings - Socket Options
    o = s.taboption(
      "stream",
      form.Value,
      "ss_sockopt_mark",
      "%s - %s".format(_("Sockopt"), _("Mark")),
      _(
        "If transparent proxy is enabled, this option is ignored and will be set to 255."
      )
    );
    o.depends({ protocol: "wireguard", "!reverse": true });
    o.modalonly = true;
    o.placeholder = "255";

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_sockopt_domain_strategy",
      "%s - %s".format(_("Sockopt"), _("Domain strategy"))
    );
    o.modalonly = true;
    o.depends({
      protocol: /\b(http|loopback|mtproto|shadowsocks|socks|trojan|vless|vmess)\b/,
    });
    o.value("AsIs");
    o.value("UseIP");
    o.value("UseIPv4");
    o.value("UseIPv6");

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_sockopt_tcp_fast_open",
      "%s - %s".format(_("Sockopt"), _("TCP fast open"))
    );
    o.depends({ protocol: "wireguard", "!reverse": true });
    o.modalonly = true;
    o.value("");
    o.value("0", _("False"));
    o.value("1", _("True"));

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_sockopt_tcp_no_Delay",
      "%s - %s".format(_("Sockopt"), _("TCP No Delay"))
    );
    o.depends("s_freedom_fragment_enabled", "1");
    o.modalonly = true;
    o.rmempty = true;
    o.value("0", _("False"));
    o.value("1", _("True"));

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_sockopt_dialer_proxy",
      _("Dialer Proxy")
    );
    o.modalonly = true;
    o.rmempty = true;
    o.depends({ protocol: "wireguard", "!reverse": true });
    o.validate = function (sid, value) {
      const current_tag: string = uci.get("v2ray", sid, "tag");
      if (current_tag != value) {
        return true;
      }
      return _("Unable to use current outbound itself as proxy");
    };
    o.value("", _("None"));
    for (let i = 0; i < outbound_alias.length; i++) {
      o.value(
        outbound_tag[i].caption,
        `${outbound_alias[i].caption}(${outbound_tag[i].caption})`
      );
    }
    for (const rp of reverse_portals) {
      const stmp = String(rp.caption);
      const cap = stmp.split(",");
      for (const rpa of cap) {
        o.value(rpa.substring(0, rpa.indexOf("|")), rpa);
      }
    }

    o = s.taboption(
      "stream",
      form.ListValue,
      "ss_sockopt_tcp_congestion",
      "%s - %s".format("TCP", _("Congestion Control"))
    );
    o.modalonly = true;
    o.rmempty = true;
    o.value("", _("Default"));
    o.depends({
      protocol: /\b(http|trojan|vless|vmess)\b/,
      ss_network: /\b(grpc|h2|tcp|ws)\b/,
    });
    o.depends({ protocol: /\b(freedom|mtproto|socks)\b/ });
    for (let i = 0; i < tcp_congestion.length; i++) {
      o.value(tcp_congestion[i]);
    }

    o = s.taboption(
      "general",
      form.ListValue,
      "proxy_settings_tag",
      "%s - %s".format(_("Proxy settings"), _("Tag"))
    );
    o.modalonly = true;
    o.rmempty = true;
    o.validate = function (sid, value) {
      const current_tag: string = uci.get("v2ray", sid, "tag");
      if (current_tag != value) {
        return true;
      }
      return _("Unable to use current outbound itself as proxy");
    };
    o.value("", _("None"));
    for (let i = 0; i < outbound_alias.length; i++) {
      o.value(
        outbound_tag[i].caption,
        `${outbound_alias[i].caption}(${outbound_tag[i].caption})`
      );
    }
    for (const rp of reverse_portals) {
      const stmp = String(rp.caption);
      const cap = stmp.split(",");
      for (const rpa of cap) {
        o.value(rpa.substring(0, rpa.indexOf("|")), rpa);
      }
    }

    o = s.taboption("stream", form.DummyValue, "reality_check");
    o.depends({ protocol: "wireguard", "!reverse": true });
    o.hidden = true;
    o.uciconfig = "v2ray";
    o.ucisection = "main";
    o.ucioption = "reality";
    o.modalonly = true;

    o = s.taboption(
      "mux",
      form.Flag,
      "mux_enabled",
      "%s - %s".format(_("Mux"), _("Enabled"))
    );
    o.modalonly = true;
    o.depends({
      ss_network: /\b(ws|tcp|grpc|h2)\b/,
      ss_security: /\b(tls|none)\b/,
    });
    o.enabled = "1";
    o.disabled = "0";

    o = s.taboption("mux", form.Value, "mux_concurrency", _("Mux Concurrency"));
    o.modalonly = true;
    o.depends("mux_enabled", "1");
    o.datatype = "and(min(-1), max(1024), integer)";
    o.placeholder = "8";

    o = s.taboption(
      "mux",
      form.Value,
      "xudp_concurrency",
      _("xudp Concurrency")
    );
    o.modalonly = true;
    o.depends({ mux_enabled: "1", reality_check: "1" });
    o.datatype = "and(min(-1), max(1024), integer)";
    o.placeholder = "8";

    o = s.taboption(
      "mux",
      form.ListValue,
      "xudp_proxy_udp443",
      _("Proxy UDP443")
    );
    o.modalonly = true;
    o.depends({ mux_enabled: "1", reality_check: "1" });
    o.value("reject", _("Reject"));
    o.value("allow", _("Allow"));
    o.value("skip", _("Skip"));

    const self = this;
    return m.render().then(function (node: Node) {
      const container = m.findElement("id", "cbi-v2ray-outbound");

      const importButton = E(
        "div",
        {
          class: "cbi-section-create cbi-tblsection-create",
        },
        E(
          "button",
          {
            class: "cbi-button cbi-button-neutral",
            title: _("Import (Vmess Only)"),
            click: L.bind(self.handleImportClick, self),
          },
          _("Import (Vmess Only)")
        )
      );

      L.dom.append(container, importButton);

      return node;
    });
  },
});
