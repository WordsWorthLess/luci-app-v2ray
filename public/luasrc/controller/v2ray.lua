module("luci.controller.v2ray", package.seeall)

local fs = require "nixio.fs"
local i18n = require "luci.i18n"

function index()
	if not nixio.fs.access("/etc/config/v2ray") then
		return
	end

	entry({"admin", "services", "v2ray"}, firstchild(), _("V2Ray")).dependent = false

	entry({"admin", "services", "v2ray", "main"}, view("v2ray/main"), _("Global Settings"), 10)

	entry({"admin", "services", "v2ray", "inbound"}, view("v2ray/inbound"), _("Inbound"), 20).leaf = true

	entry({"admin", "services", "v2ray", "outbound"}, view("v2ray/outbound"), _("Outbound"), 30).leaf = true

	entry({"admin", "services", "v2ray", "dns"}, view("v2ray/dns"), _("DNS"), 40)

	entry({"admin", "services", "v2ray", "routing"}, view("v2ray/routing"), _("Routing"), 50)

	entry({"admin", "services", "v2ray", "policy"}, view("v2ray/policy"), _("Policy"), 60)

	entry({"admin", "services", "v2ray", "reverse"}, view("v2ray/reverse"), _("Reverse"), 70)

	entry({"admin", "services", "v2ray", "transparent-proxy"}, view("v2ray/transparent-proxy"), _("Transparent Proxy"), 80)

  entry({"admin", "services", "v2ray", "about"}, view("v2ray/about"), _("About"), 90)
end