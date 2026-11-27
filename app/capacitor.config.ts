import type { CapacitorConfig } from "@capacitor/cli";

// App do BooTickets. Ele abre o próprio site (bootickets.com.br): toda melhoria publicada no site
// já vale no app, sem nova versão na loja. Sem internet, abre a página local "offline.html",
// que mostra os ingressos guardados no celular (o QR Code funciona na porta mesmo sem sinal).
const config: CapacitorConfig = {
  appId: "br.com.bootickets.app",
  appName: "BooTickets",
  webDir: "www",
  server: {
    url: "https://bootickets.com.br",
    errorPath: "offline.html",
    // Só estes endereços abrem dentro do app; o resto (bancos, Instagram, mapas) abre fora.
    allowNavigation: ["bootickets.com.br", "www.bootickets.com.br", "*.mercadopago.com.br", "*.mercadopago.com", "*.mercadolibre.com", "*.mercadolivre.com.br"],
  },
  backgroundColor: "#090B0F",
  android: { backgroundColor: "#090B0F" },
  ios: { backgroundColor: "#090B0F", contentInset: "never" },
  plugins: {
    SplashScreen: { launchShowDuration: 900, launchAutoHide: true, backgroundColor: "#090B0F", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#090B0F", overlaysWebView: false },
    // Notificação aparece mesmo com o app aberto na tela.
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
