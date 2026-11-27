# Resultado da caça a bugs

513 execuções (testes × aparelhos): **392 ok**, **111 com problema**, 10 puladas.

## Problemas por teste

### app-e-rede.spec.ts › sem internet na porta: o ingresso abre com o QR Code
Aparelhos: pc-safari

- Error: expect(locator).toHaveCount(expected) failed ⏎ Locator:  locator('article') ⏎ Expected: 1 ⏎ Received: 0 ⏎ Timeout:  10000ms ⏎ Call log:

### app-e-rede.spec.ts › voltar e avançar no navegador não quebra a compra
Aparelhos: pc-safari, iphone-se, iphone-15, tablet-ipad

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByRole('button', { name: 'Adicionar um ingresso Pista — 1º lote' }) ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 5 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### app-e-rede.spec.ts › manifesto do app e ícones existem (para instalar pelo navegador)
Aparelhos: pc-chrome

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [checkout] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText('QA Festa Principal').first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › misturar Pista, Meia e Camarote na mesma compra soma certo
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › sem conta: 'Entrar para comprar' leva ao login e volta para o evento
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › titular com CPF inválido: mostra erro e não cria pedido
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › sem marcar o aceite dos Termos não vai para o pagamento
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › cupom QA10 dá 10% de desconto e cupom errado mostra erro
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › evento privado: senha errada não libera, senha certa libera os ingressos
Aparelhos: pc-safari, iphone-se, iphone-15, tablet-ipad

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/incorret|inválid|errad|não confere/i).first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › evento grátis: dá para pegar ingresso sem pagar
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: expect(page).toHaveURL(expected) failed ⏎ Expected pattern: /checkout/ ⏎ Received string:  "http://localhost:8080/eventos/832caef5-ccb9-46c0-bcb8-9ea11a02e2db" ⏎ Timeout: 10000ms ⏎ Call log: ⏎   - Expect "toHaveURL" with timeout 10000ms
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › clique duplo em 'Ir para pagamento' não cria dois pedidos
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › voltar do pagamento e cancelar o pedido devolve os ingressos
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › recarregar a página do pagamento não perde o pedido
Aparelhos: pc-safari

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › devolver a compra em Meus ingressos cancela os ingressos
Aparelhos: pc-safari

- Error: expect(locator).toHaveCount(expected) failed ⏎ Locator:  locator('article') ⏎ Expected: 1 ⏎ Received: 0 ⏎ Timeout:  10000ms ⏎ Call log:

### compra.spec.ts › transferir ingresso: a outra pessoa recebe e aceita
Aparelhos: pc-safari

- Test timeout of 60000ms exceeded.
- Error: locator.click: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - waiting for getByRole('button', { name: /transferir/i }).first() ⏎   236 |   await buyPaid(me.token, s.main.id, s.main.pista, [{ name: me.name, cpf: me.cpf }]); ⏎   237 |   await page.goto("/ingressos"); ⏎ > 238 |   await page.getByRole("button", { name: /transferir/i }).first().click();

### compra.spec.ts › nomes com acento, emoji e muito compridos aparecem direito no ingresso
Aparelhos: pc-safari

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText('José Antônio da Conceição Ñuñez').first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:

### compra.spec.ts › nome de titular com código malicioso não roda no navegador (XSS)
Aparelhos: pc-safari

- Test timeout of 60000ms exceeded.
- Error: page.waitForLoadState: Test timeout of 60000ms exceeded. ⏎   269 |   await buyPaid(me.token, s.main.id, s.main.meia, [{ name: evil, cpf: cpf() }]); ⏎   270 |   await page.goto("/ingressos"); ⏎ > 271 |   await page.waitForLoadState("networkidle"); ⏎       |              ^ ⏎   272 |   expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();

### conta.spec.ts › cadastro novo pela tela entra direto na conta
Aparelhos: pc-safari

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/você ainda não tem ingressos/i) ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:

### conta.spec.ts › login com senha errada mostra erro e não entra
Aparelhos: iphone-15

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/incorret|inválid|errad/i).first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

### conta.spec.ts › login certo, recarregar a página continua logado, e sair funciona
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Test timeout of 60000ms exceeded.
- Error: page.reload: net::ERR_ABORTED; maybe frame was detached? ⏎ Call log: ⏎   - waiting for navigation until "load" ⏎   84 |   await expect(page).not.toHaveURL(/entrar/); ⏎   85 |   await page.goto("/ingressos"); ⏎ > 86 |   await page.reload();
- Error: page.goto: NS_BINDING_ABORTED ⏎ Call log: ⏎   - navigating to "http://localhost:8080/ingressos", waiting until "load" ⏎   83 |   await page.getByRole("button", { name: "Entrar" }).click(); ⏎   84 |   await expect(page).not.toHaveURL(/entrar/); ⏎ > 85 |   await page.goto("/ingressos");
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### conta.spec.ts › página protegida manda para o login e volta depois
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Test timeout of 60000ms exceeded.
- Error: locator.click: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - waiting for locator('main').getByRole('link', { name: /entrar/i }).first() ⏎   100 |   await page.goto("/ingressos"); ⏎   101 |   await page.waitForLoadState("networkidle"); ⏎ > 102 |   if (!/entrar/.test(page.url())) await page.locator("main").getByRole("link", { name: /entrar/i }).first().click();
- Error: page.waitForLoadState: Test timeout of 60000ms exceeded. ⏎    99 |   const b = await newBuyer(); ⏎   100 |   await page.goto("/ingressos"); ⏎ > 101 |   await page.waitForLoadState("networkidle"); ⏎       |              ^ ⏎   102 |   if (!/entrar/.test(page.url())) await page.locator("main").getByRole("link", { name: /entrar/i }).first().click();

### conta.spec.ts › esqueci a senha responde ok sem revelar se o e-mail existe
Aparelhos: iphone-se, tablet-ipad

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/enviamos|se .* conta|verifique/i).first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:

### paginas.spec.ts › página / abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 5 ⏎ - Array [] ⏎ + Array [
- Error: [/] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /eventos abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/eventos] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [/eventos] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /entrar abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/entrar] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /cadastro abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/cadastro] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/cadastro] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 5 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /esqueci-senha abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/esqueci-senha] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /termos abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/termos] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 8 ⏎ - Array [] ⏎ + Array [
- Error: [/termos] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 9 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /privacidade abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/privacidade] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [
- Error: [/privacidade] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /termos-organizador abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/termos-organizador] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/termos-organizador] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 5 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /app abre certinha
Aparelhos: pc-safari, iphone-se, iphone-15, android-pixel, android-pequeno

- Test timeout of 60000ms exceeded.
- Error: page.evaluate: Target page, context or browser has been closed ⏎    at ../fixtures.ts:57 ⏎   55 |   await page.waitForLoadState("networkidle").catch(() => undefined); ⏎   56 |   // Rola até o fim para carregar tudo o que aparece ao rolar (animações de entrada, imagens). ⏎ > 57 |   await page.evaluate(async () => { ⏎      |              ^
- Error: [/app] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [/app] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › páginas de cada evento de teste
Aparelhos: pc-safari, android-pequeno

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 7 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Festa Principal] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Esgotado] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Festival Internacional de Música Eletrônica e Artes Visuais com Convidados Especiais Edição de Verão Superlonga 2027] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Entrada Grátis] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Últimos Ingressos] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › páginas da conta logada
Aparelhos: pc-safari, iphone-se, iphone-15, android-pixel, android-pequeno

- Test timeout of 60000ms exceeded.
- Error: page.evaluate: Target page, context or browser has been closed ⏎    at ../fixtures.ts:57 ⏎   55 |   await page.waitForLoadState("networkidle").catch(() => undefined); ⏎   56 |   // Rola até o fim para carregar tudo o que aparece ao rolar (animações de entrada, imagens). ⏎ > 57 |   await page.evaluate(async () => { ⏎      |              ^
- Error: [/organizador (logado)] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [/organizador (logado)] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › busca com textos estranhos não quebra
Aparelhos: pc-safari, iphone-se, iphone-15, tablet-ipad

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 7 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

## Medições

- sem internet na porta: o ingresso abre com o QR Code (pc-firefox): skip: o Firefox do Playwright não simula sem-internet com service worker
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-chrome): tempo-3g: 29 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-firefox): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-safari): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (notebook-pequeno): tempo-3g: 28 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (iphone-se): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (iphone-15): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (android-pixel): tempo-3g: 28 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (android-pequeno): tempo-3g: 29 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (tablet-ipad): skip: simulação de 3G só existe no Chrome
- página /app: botão de instalar ou passo a passo aparece no celular (pc-chrome): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (pc-firefox): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (pc-safari): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (notebook-pequeno): skip: só no celular

## Todas as execuções

| Teste | Aparelho | Resultado | Tempo |
|---|---|---|---|
| sem internet na porta: o ingresso abre com o QR Code | pc-chrome | ok | 3.1 s |
| sem internet na porta: o ingresso abre com o QR Code | pc-firefox | pulado | 2.4 s |
| sem internet na porta: o ingresso abre com o QR Code | pc-safari | FALHOU | 33.0 s |
| sem internet na porta: o ingresso abre com o QR Code | notebook-pequeno | ok | 2.5 s |
| sem internet na porta: o ingresso abre com o QR Code | iphone-se | ok | 2.9 s |
| sem internet na porta: o ingresso abre com o QR Code | iphone-15 | ok | 2.8 s |
| sem internet na porta: o ingresso abre com o QR Code | android-pixel | ok | 3.7 s |
| sem internet na porta: o ingresso abre com o QR Code | android-pequeno | ok | 3.6 s |
| sem internet na porta: o ingresso abre com o QR Code | tablet-ipad | ok | 3.9 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-chrome | ok | 29.5 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-firefox | pulado | 2.7 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-safari | pulado | 4.3 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | notebook-pequeno | ok | 28.1 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | iphone-se | pulado | 0.8 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | iphone-15 | pulado | 0.9 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | android-pixel | ok | 29.2 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | android-pequeno | ok | 29.7 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | tablet-ipad | pulado | 1.1 s |
| voltar e avançar no navegador não quebra a compra | pc-chrome | ok | 6.0 s |
| voltar e avançar no navegador não quebra a compra | pc-firefox | ok | 8.7 s |
| voltar e avançar no navegador não quebra a compra | pc-safari | FALHOU | 15.4 s |
| voltar e avançar no navegador não quebra a compra | notebook-pequeno | ok | 3.9 s |
| voltar e avançar no navegador não quebra a compra | iphone-se | FALHOU | 17.2 s |
| voltar e avançar no navegador não quebra a compra | iphone-15 | FALHOU | 7.5 s |
| voltar e avançar no navegador não quebra a compra | android-pixel | ok | 4.6 s |
| voltar e avançar no navegador não quebra a compra | android-pequeno | ok | 4.2 s |
| voltar e avançar no navegador não quebra a compra | tablet-ipad | FALHOU | 11.3 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-chrome | FALHOU | 2.2 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-firefox | ok | 2.8 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-safari | ok | 2.7 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | notebook-pequeno | ok | 1.2 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | iphone-se | ok | 2.0 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | iphone-15 | ok | 2.5 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | android-pixel | ok | 1.3 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | android-pequeno | ok | 1.3 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | tablet-ipad | ok | 4.9 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-chrome | pulado | 0.5 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-firefox | pulado | 0.8 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-safari | pulado | 1.1 s |
| página /app: botão de instalar ou passo a passo aparece no celular | notebook-pequeno | pulado | 0.1 s |
| página /app: botão de instalar ou passo a passo aparece no celular | iphone-se | ok | 2.9 s |
| página /app: botão de instalar ou passo a passo aparece no celular | iphone-15 | ok | 2.3 s |
| página /app: botão de instalar ou passo a passo aparece no celular | android-pixel | ok | 1.0 s |
| página /app: botão de instalar ou passo a passo aparece no celular | android-pequeno | ok | 1.0 s |
| página /app: botão de instalar ou passo a passo aparece no celular | tablet-ipad | ok | 4.0 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-chrome | ok | 0.3 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-firefox | ok | 0.8 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-safari | ok | 1.0 s |
| compartilhar link do evento: a prévia tem título e imagem | notebook-pequeno | ok | 0.1 s |
| compartilhar link do evento: a prévia tem título e imagem | iphone-se | ok | 1.0 s |
| compartilhar link do evento: a prévia tem título e imagem | iphone-15 | ok | 1.2 s |
| compartilhar link do evento: a prévia tem título e imagem | android-pixel | ok | 0.3 s |
| compartilhar link do evento: a prévia tem título e imagem | android-pequeno | ok | 0.4 s |
| compartilhar link do evento: a prévia tem título e imagem | tablet-ipad | ok | 1.2 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-chrome | FALHOU | 11.5 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-firefox | FALHOU | 16.4 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-safari | FALHOU | 46.3 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | notebook-pequeno | FALHOU | 8.5 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | iphone-se | FALHOU | 12.2 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | iphone-15 | FALHOU | 22.2 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | android-pixel | FALHOU | 10.5 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | android-pequeno | FALHOU | 13.0 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | tablet-ipad | FALHOU | 25.6 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-chrome | ok | 4.0 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-firefox | ok | 4.6 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-safari | FALHOU | 7.5 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | notebook-pequeno | ok | 2.3 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | iphone-se | ok | 5.2 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | iphone-15 | ok | 7.1 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | android-pixel | ok | 2.3 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | android-pequeno | ok | 4.1 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | tablet-ipad | ok | 9.6 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-chrome | ok | 4.1 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-firefox | ok | 5.6 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-safari | FALHOU | 14.9 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | notebook-pequeno | ok | 3.2 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | iphone-se | ok | 6.5 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | iphone-15 | ok | 9.4 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | android-pixel | ok | 3.4 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | android-pequeno | ok | 4.4 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | tablet-ipad | ok | 10.3 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-chrome | ok | 3.8 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-firefox | ok | 8.1 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-safari | FALHOU | 4.5 s |
| titular com CPF inválido: mostra erro e não cria pedido | notebook-pequeno | ok | 2.4 s |
| titular com CPF inválido: mostra erro e não cria pedido | iphone-se | ok | 7.0 s |
| titular com CPF inválido: mostra erro e não cria pedido | iphone-15 | ok | 6.0 s |
| titular com CPF inválido: mostra erro e não cria pedido | android-pixel | ok | 3.0 s |
| titular com CPF inválido: mostra erro e não cria pedido | android-pequeno | ok | 4.1 s |
| titular com CPF inválido: mostra erro e não cria pedido | tablet-ipad | ok | 10.1 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-chrome | ok | 4.1 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-firefox | ok | 6.3 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-safari | FALHOU | 4.9 s |
| sem marcar o aceite dos Termos não vai para o pagamento | notebook-pequeno | ok | 2.8 s |
| sem marcar o aceite dos Termos não vai para o pagamento | iphone-se | ok | 5.7 s |
| sem marcar o aceite dos Termos não vai para o pagamento | iphone-15 | ok | 10.9 s |
| sem marcar o aceite dos Termos não vai para o pagamento | android-pixel | ok | 5.6 s |
| sem marcar o aceite dos Termos não vai para o pagamento | android-pequeno | ok | 3.9 s |
| sem marcar o aceite dos Termos não vai para o pagamento | tablet-ipad | ok | 10.4 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-chrome | ok | 3.8 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-firefox | ok | 12.9 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-safari | FALHOU | 9.8 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | notebook-pequeno | ok | 3.5 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | iphone-se | ok | 9.0 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | iphone-15 | ok | 15.1 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | android-pixel | ok | 4.9 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | android-pequeno | ok | 4.6 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | tablet-ipad | ok | 15.4 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-chrome | ok | 3.3 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-firefox | ok | 7.1 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-safari | FALHOU | 11.1 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | notebook-pequeno | ok | 2.7 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | iphone-se | ok | 6.8 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | iphone-15 | ok | 12.4 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | android-pixel | ok | 3.9 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | android-pequeno | ok | 4.6 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | tablet-ipad | ok | 9.8 s |
| evento esgotado não deixa comprar e avisa | pc-chrome | ok | 2.9 s |
| evento esgotado não deixa comprar e avisa | pc-firefox | ok | 8.3 s |
| evento esgotado não deixa comprar e avisa | pc-safari | ok | 4.1 s |
| evento esgotado não deixa comprar e avisa | notebook-pequeno | ok | 1.6 s |
| evento esgotado não deixa comprar e avisa | iphone-se | ok | 2.7 s |
| evento esgotado não deixa comprar e avisa | iphone-15 | ok | 2.6 s |
| evento esgotado não deixa comprar e avisa | android-pixel | ok | 2.5 s |
| evento esgotado não deixa comprar e avisa | android-pequeno | ok | 2.7 s |
| evento esgotado não deixa comprar e avisa | tablet-ipad | ok | 3.4 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-chrome | ok | 3.3 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-firefox | ok | 5.9 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-safari | ok | 5.4 s |
| últimos ingressos: não deixa escolher mais do que tem | notebook-pequeno | ok | 2.0 s |
| últimos ingressos: não deixa escolher mais do que tem | iphone-se | ok | 2.7 s |
| últimos ingressos: não deixa escolher mais do que tem | iphone-15 | ok | 6.5 s |
| últimos ingressos: não deixa escolher mais do que tem | android-pixel | ok | 3.3 s |
| últimos ingressos: não deixa escolher mais do que tem | android-pequeno | ok | 4.1 s |
| últimos ingressos: não deixa escolher mais do que tem | tablet-ipad | ok | 3.3 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-chrome | ok | 3.1 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-firefox | ok | 7.9 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-safari | FALHOU | 14.9 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | notebook-pequeno | ok | 2.1 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | iphone-se | FALHOU | 14.0 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | iphone-15 | FALHOU | 14.8 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | android-pixel | ok | 4.5 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | android-pequeno | ok | 4.5 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | tablet-ipad | FALHOU | 16.7 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-chrome | FALHOU | 14.3 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-firefox | FALHOU | 18.1 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-safari | FALHOU | 18.6 s |
| evento grátis: dá para pegar ingresso sem pagar | notebook-pequeno | FALHOU | 13.5 s |
| evento grátis: dá para pegar ingresso sem pagar | iphone-se | FALHOU | 17.0 s |
| evento grátis: dá para pegar ingresso sem pagar | iphone-15 | FALHOU | 18.1 s |
| evento grátis: dá para pegar ingresso sem pagar | android-pixel | FALHOU | 18.6 s |
| evento grátis: dá para pegar ingresso sem pagar | android-pequeno | FALHOU | 14.7 s |
| evento grátis: dá para pegar ingresso sem pagar | tablet-ipad | FALHOU | 19.5 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-chrome | ok | 3.7 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-firefox | ok | 6.4 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-safari | FALHOU | 7.3 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | notebook-pequeno | ok | 2.1 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | iphone-se | ok | 5.7 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | iphone-15 | ok | 6.6 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | android-pixel | ok | 6.4 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | android-pequeno | ok | 4.3 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | tablet-ipad | ok | 9.5 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-chrome | ok | 4.2 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-firefox | ok | 6.7 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-safari | FALHOU | 6.8 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | notebook-pequeno | ok | 3.2 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | iphone-se | ok | 4.6 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | iphone-15 | ok | 6.9 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | android-pixel | ok | 6.5 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | android-pequeno | ok | 4.8 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | tablet-ipad | ok | 9.7 s |
| recarregar a página do pagamento não perde o pedido | pc-chrome | ok | 3.4 s |
| recarregar a página do pagamento não perde o pedido | pc-firefox | ok | 6.8 s |
| recarregar a página do pagamento não perde o pedido | pc-safari | FALHOU | 8.4 s |
| recarregar a página do pagamento não perde o pedido | notebook-pequeno | ok | 3.1 s |
| recarregar a página do pagamento não perde o pedido | iphone-se | ok | 4.0 s |
| recarregar a página do pagamento não perde o pedido | iphone-15 | ok | 5.5 s |
| recarregar a página do pagamento não perde o pedido | android-pixel | ok | 6.3 s |
| recarregar a página do pagamento não perde o pedido | android-pequeno | ok | 4.5 s |
| recarregar a página do pagamento não perde o pedido | tablet-ipad | ok | 6.2 s |
| pedido de outra pessoa não abre | pc-chrome | ok | 1.2 s |
| pedido de outra pessoa não abre | pc-firefox | ok | 1.9 s |
| pedido de outra pessoa não abre | pc-safari | ok | 2.7 s |
| pedido de outra pessoa não abre | notebook-pequeno | ok | 1.4 s |
| pedido de outra pessoa não abre | iphone-se | ok | 1.1 s |
| pedido de outra pessoa não abre | iphone-15 | ok | 1.6 s |
| pedido de outra pessoa não abre | android-pixel | ok | 2.3 s |
| pedido de outra pessoa não abre | android-pequeno | ok | 1.8 s |
| pedido de outra pessoa não abre | tablet-ipad | ok | 1.7 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-chrome | ok | 2.0 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-firefox | ok | 2.9 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-safari | FALHOU | 33.4 s |
| devolver a compra em Meus ingressos cancela os ingressos | notebook-pequeno | ok | 1.6 s |
| devolver a compra em Meus ingressos cancela os ingressos | iphone-se | ok | 2.1 s |
| devolver a compra em Meus ingressos cancela os ingressos | iphone-15 | ok | 5.2 s |
| devolver a compra em Meus ingressos cancela os ingressos | android-pixel | ok | 4.7 s |
| devolver a compra em Meus ingressos cancela os ingressos | android-pequeno | ok | 2.4 s |
| devolver a compra em Meus ingressos cancela os ingressos | tablet-ipad | ok | 3.0 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-chrome | ok | 5.2 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-firefox | ok | 6.8 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-safari | FALHOU | 78.3 s |
| transferir ingresso: a outra pessoa recebe e aceita | notebook-pequeno | ok | 4.2 s |
| transferir ingresso: a outra pessoa recebe e aceita | iphone-se | ok | 5.7 s |
| transferir ingresso: a outra pessoa recebe e aceita | iphone-15 | ok | 9.7 s |
| transferir ingresso: a outra pessoa recebe e aceita | android-pixel | ok | 8.1 s |
| transferir ingresso: a outra pessoa recebe e aceita | android-pequeno | ok | 5.4 s |
| transferir ingresso: a outra pessoa recebe e aceita | tablet-ipad | ok | 9.1 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-chrome | ok | 5.5 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-firefox | ok | 7.0 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-safari | FALHOU | 27.4 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | notebook-pequeno | ok | 4.4 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | iphone-se | ok | 5.6 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | iphone-15 | ok | 7.7 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | android-pixel | ok | 6.7 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | android-pequeno | ok | 5.3 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | tablet-ipad | ok | 6.7 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-chrome | ok | 2.4 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-firefox | ok | 2.3 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-safari | FALHOU | 78.3 s |
| nome de titular com código malicioso não roda no navegador (XSS) | notebook-pequeno | ok | 2.6 s |
| nome de titular com código malicioso não roda no navegador (XSS) | iphone-se | ok | 3.1 s |
| nome de titular com código malicioso não roda no navegador (XSS) | iphone-15 | ok | 4.8 s |
| nome de titular com código malicioso não roda no navegador (XSS) | android-pixel | ok | 3.5 s |
| nome de titular com código malicioso não roda no navegador (XSS) | android-pequeno | ok | 2.0 s |
| nome de titular com código malicioso não roda no navegador (XSS) | tablet-ipad | ok | 4.3 s |
| cadastro novo pela tela entra direto na conta | pc-chrome | ok | 3.2 s |
| cadastro novo pela tela entra direto na conta | pc-firefox | ok | 4.5 s |
| cadastro novo pela tela entra direto na conta | pc-safari | FALHOU | 31.6 s |
| cadastro novo pela tela entra direto na conta | notebook-pequeno | ok | 3.1 s |
| cadastro novo pela tela entra direto na conta | iphone-se | ok | 5.6 s |
| cadastro novo pela tela entra direto na conta | iphone-15 | ok | 6.0 s |
| cadastro novo pela tela entra direto na conta | android-pixel | ok | 3.5 s |
| cadastro novo pela tela entra direto na conta | android-pequeno | ok | 3.4 s |
| cadastro novo pela tela entra direto na conta | tablet-ipad | ok | 8.2 s |
| cadastro com CPF digitado sem pontos também funciona | pc-chrome | ok | 2.5 s |
| cadastro com CPF digitado sem pontos também funciona | pc-firefox | ok | 3.2 s |
| cadastro com CPF digitado sem pontos também funciona | pc-safari | ok | 8.3 s |
| cadastro com CPF digitado sem pontos também funciona | notebook-pequeno | ok | 2.1 s |
| cadastro com CPF digitado sem pontos também funciona | iphone-se | ok | 2.7 s |
| cadastro com CPF digitado sem pontos também funciona | iphone-15 | ok | 6.9 s |
| cadastro com CPF digitado sem pontos também funciona | android-pixel | ok | 5.2 s |
| cadastro com CPF digitado sem pontos também funciona | android-pequeno | ok | 3.1 s |
| cadastro com CPF digitado sem pontos também funciona | tablet-ipad | ok | 6.8 s |
| cadastro com CPF inválido mostra erro claro | pc-chrome | ok | 2.1 s |
| cadastro com CPF inválido mostra erro claro | pc-firefox | ok | 6.0 s |
| cadastro com CPF inválido mostra erro claro | pc-safari | ok | 4.9 s |
| cadastro com CPF inválido mostra erro claro | notebook-pequeno | ok | 1.8 s |
| cadastro com CPF inválido mostra erro claro | iphone-se | ok | 2.5 s |
| cadastro com CPF inválido mostra erro claro | iphone-15 | ok | 3.7 s |
| cadastro com CPF inválido mostra erro claro | android-pixel | ok | 2.0 s |
| cadastro com CPF inválido mostra erro claro | android-pequeno | ok | 2.1 s |
| cadastro com CPF inválido mostra erro claro | tablet-ipad | ok | 3.6 s |
| cadastro com e-mail já usado avisa | pc-chrome | ok | 2.3 s |
| cadastro com e-mail já usado avisa | pc-firefox | ok | 6.8 s |
| cadastro com e-mail já usado avisa | pc-safari | ok | 5.7 s |
| cadastro com e-mail já usado avisa | notebook-pequeno | ok | 1.9 s |
| cadastro com e-mail já usado avisa | iphone-se | ok | 3.5 s |
| cadastro com e-mail já usado avisa | iphone-15 | ok | 4.0 s |
| cadastro com e-mail já usado avisa | android-pixel | ok | 2.4 s |
| cadastro com e-mail já usado avisa | android-pequeno | ok | 2.9 s |
| cadastro com e-mail já usado avisa | tablet-ipad | ok | 2.9 s |
| cadastro com CPF já usado avisa | pc-chrome | ok | 3.0 s |
| cadastro com CPF já usado avisa | pc-firefox | ok | 3.8 s |
| cadastro com CPF já usado avisa | pc-safari | ok | 5.8 s |
| cadastro com CPF já usado avisa | notebook-pequeno | ok | 2.1 s |
| cadastro com CPF já usado avisa | iphone-se | ok | 3.0 s |
| cadastro com CPF já usado avisa | iphone-15 | ok | 3.8 s |
| cadastro com CPF já usado avisa | android-pixel | ok | 2.8 s |
| cadastro com CPF já usado avisa | android-pequeno | ok | 2.3 s |
| cadastro com CPF já usado avisa | tablet-ipad | ok | 3.2 s |
| cadastro com senha curta não passa | pc-chrome | ok | 2.0 s |
| cadastro com senha curta não passa | pc-firefox | ok | 3.5 s |
| cadastro com senha curta não passa | pc-safari | ok | 5.7 s |
| cadastro com senha curta não passa | notebook-pequeno | ok | 1.7 s |
| cadastro com senha curta não passa | iphone-se | ok | 3.1 s |
| cadastro com senha curta não passa | iphone-15 | ok | 3.3 s |
| cadastro com senha curta não passa | android-pixel | ok | 3.2 s |
| cadastro com senha curta não passa | android-pequeno | ok | 2.5 s |
| cadastro com senha curta não passa | tablet-ipad | ok | 3.1 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-chrome | ok | 4.7 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-firefox | ok | 6.3 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-safari | ok | 13.3 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | notebook-pequeno | ok | 4.0 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | iphone-se | ok | 6.0 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | iphone-15 | ok | 14.0 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | android-pixel | ok | 6.8 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | android-pequeno | ok | 5.7 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | tablet-ipad | ok | 9.2 s |
| login com senha errada mostra erro e não entra | pc-chrome | ok | 2.8 s |
| login com senha errada mostra erro e não entra | pc-firefox | ok | 4.0 s |
| login com senha errada mostra erro e não entra | pc-safari | ok | 7.9 s |
| login com senha errada mostra erro e não entra | notebook-pequeno | ok | 2.5 s |
| login com senha errada mostra erro e não entra | iphone-se | ok | 3.2 s |
| login com senha errada mostra erro e não entra | iphone-15 | FALHOU | 14.3 s |
| login com senha errada mostra erro e não entra | android-pixel | ok | 2.7 s |
| login com senha errada mostra erro e não entra | android-pequeno | ok | 2.4 s |
| login com senha errada mostra erro e não entra | tablet-ipad | ok | 3.7 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-chrome | FALHOU | 72.4 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-firefox | FALHOU | 5.6 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-safari | FALHOU | 72.3 s |
| login certo, recarregar a página continua logado, e sair funciona | notebook-pequeno | FALHOU | 72.3 s |
| login certo, recarregar a página continua logado, e sair funciona | iphone-se | FALHOU | 78.5 s |
| login certo, recarregar a página continua logado, e sair funciona | iphone-15 | FALHOU | 20.3 s |
| login certo, recarregar a página continua logado, e sair funciona | android-pixel | FALHOU | 78.5 s |
| login certo, recarregar a página continua logado, e sair funciona | android-pequeno | FALHOU | 78.9 s |
| login certo, recarregar a página continua logado, e sair funciona | tablet-ipad | FALHOU | 78.8 s |
| página protegida manda para o login e volta depois | pc-chrome | FALHOU | 78.4 s |
| página protegida manda para o login e volta depois | pc-firefox | FALHOU | 79.5 s |
| página protegida manda para o login e volta depois | pc-safari | FALHOU | 78.4 s |
| página protegida manda para o login e volta depois | notebook-pequeno | FALHOU | 78.3 s |
| página protegida manda para o login e volta depois | iphone-se | FALHOU | 78.4 s |
| página protegida manda para o login e volta depois | iphone-15 | FALHOU | 78.4 s |
| página protegida manda para o login e volta depois | android-pixel | FALHOU | 78.3 s |
| página protegida manda para o login e volta depois | android-pequeno | FALHOU | 78.5 s |
| página protegida manda para o login e volta depois | tablet-ipad | FALHOU | 78.4 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-chrome | ok | 2.1 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-firefox | ok | 3.2 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-safari | ok | 8.5 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | notebook-pequeno | ok | 2.0 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | iphone-se | FALHOU | 12.6 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | iphone-15 | ok | 2.4 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | android-pixel | ok | 2.5 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | android-pequeno | ok | 2.0 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | tablet-ipad | FALHOU | 12.6 s |
| mostrar/ocultar senha funciona | pc-chrome | ok | 1.9 s |
| mostrar/ocultar senha funciona | pc-firefox | ok | 2.5 s |
| mostrar/ocultar senha funciona | pc-safari | ok | 10.5 s |
| mostrar/ocultar senha funciona | notebook-pequeno | ok | 1.8 s |
| mostrar/ocultar senha funciona | iphone-se | ok | 2.5 s |
| mostrar/ocultar senha funciona | iphone-15 | ok | 2.6 s |
| mostrar/ocultar senha funciona | android-pixel | ok | 2.0 s |
| mostrar/ocultar senha funciona | android-pequeno | ok | 1.7 s |
| mostrar/ocultar senha funciona | tablet-ipad | ok | 2.6 s |
| página / abre certinha | pc-chrome | ok | 3.9 s |
| página / abre certinha | pc-firefox | ok | 7.8 s |
| página / abre certinha | pc-safari | ok | 5.7 s |
| página / abre certinha | notebook-pequeno | ok | 3.0 s |
| página / abre certinha | iphone-se | FALHOU | 4.7 s |
| página / abre certinha | iphone-15 | FALHOU | 5.9 s |
| página / abre certinha | android-pixel | FALHOU | 5.7 s |
| página / abre certinha | android-pequeno | FALHOU | 5.4 s |
| página / abre certinha | tablet-ipad | ok | 4.5 s |
| página /eventos abre certinha | pc-chrome | ok | 4.1 s |
| página /eventos abre certinha | pc-firefox | ok | 6.4 s |
| página /eventos abre certinha | pc-safari | ok | 5.7 s |
| página /eventos abre certinha | notebook-pequeno | ok | 3.1 s |
| página /eventos abre certinha | iphone-se | FALHOU | 5.7 s |
| página /eventos abre certinha | iphone-15 | FALHOU | 6.3 s |
| página /eventos abre certinha | android-pixel | FALHOU | 4.9 s |
| página /eventos abre certinha | android-pequeno | FALHOU | 5.6 s |
| página /eventos abre certinha | tablet-ipad | ok | 5.4 s |
| página /entrar abre certinha | pc-chrome | ok | 3.5 s |
| página /entrar abre certinha | pc-firefox | ok | 5.1 s |
| página /entrar abre certinha | pc-safari | ok | 14.3 s |
| página /entrar abre certinha | notebook-pequeno | ok | 2.9 s |
| página /entrar abre certinha | iphone-se | FALHOU | 4.5 s |
| página /entrar abre certinha | iphone-15 | FALHOU | 4.5 s |
| página /entrar abre certinha | android-pixel | FALHOU | 3.7 s |
| página /entrar abre certinha | android-pequeno | FALHOU | 4.1 s |
| página /entrar abre certinha | tablet-ipad | ok | 5.0 s |
| página /cadastro abre certinha | pc-chrome | ok | 3.9 s |
| página /cadastro abre certinha | pc-firefox | ok | 6.7 s |
| página /cadastro abre certinha | pc-safari | ok | 13.1 s |
| página /cadastro abre certinha | notebook-pequeno | ok | 2.7 s |
| página /cadastro abre certinha | iphone-se | FALHOU | 4.7 s |
| página /cadastro abre certinha | iphone-15 | FALHOU | 5.1 s |
| página /cadastro abre certinha | android-pixel | FALHOU | 3.9 s |
| página /cadastro abre certinha | android-pequeno | FALHOU | 4.2 s |
| página /cadastro abre certinha | tablet-ipad | ok | 4.5 s |
| página /esqueci-senha abre certinha | pc-chrome | ok | 3.7 s |
| página /esqueci-senha abre certinha | pc-firefox | ok | 4.9 s |
| página /esqueci-senha abre certinha | pc-safari | ok | 13.5 s |
| página /esqueci-senha abre certinha | notebook-pequeno | ok | 2.5 s |
| página /esqueci-senha abre certinha | iphone-se | FALHOU | 4.5 s |
| página /esqueci-senha abre certinha | iphone-15 | FALHOU | 4.9 s |
| página /esqueci-senha abre certinha | android-pixel | FALHOU | 4.1 s |
| página /esqueci-senha abre certinha | android-pequeno | FALHOU | 4.3 s |
| página /esqueci-senha abre certinha | tablet-ipad | ok | 4.4 s |
| página /termos abre certinha | pc-chrome | ok | 4.6 s |
| página /termos abre certinha | pc-firefox | ok | 5.6 s |
| página /termos abre certinha | pc-safari | ok | 6.3 s |
| página /termos abre certinha | notebook-pequeno | ok | 4.0 s |
| página /termos abre certinha | iphone-se | FALHOU | 6.7 s |
| página /termos abre certinha | iphone-15 | FALHOU | 7.4 s |
| página /termos abre certinha | android-pixel | FALHOU | 6.4 s |
| página /termos abre certinha | android-pequeno | FALHOU | 6.8 s |
| página /termos abre certinha | tablet-ipad | ok | 5.9 s |
| página /privacidade abre certinha | pc-chrome | ok | 4.3 s |
| página /privacidade abre certinha | pc-firefox | ok | 5.1 s |
| página /privacidade abre certinha | pc-safari | ok | 5.9 s |
| página /privacidade abre certinha | notebook-pequeno | ok | 4.3 s |
| página /privacidade abre certinha | iphone-se | FALHOU | 6.1 s |
| página /privacidade abre certinha | iphone-15 | FALHOU | 6.5 s |
| página /privacidade abre certinha | android-pixel | FALHOU | 5.6 s |
| página /privacidade abre certinha | android-pequeno | FALHOU | 5.5 s |
| página /privacidade abre certinha | tablet-ipad | ok | 5.9 s |
| página /termos-organizador abre certinha | pc-chrome | ok | 4.1 s |
| página /termos-organizador abre certinha | pc-firefox | ok | 6.3 s |
| página /termos-organizador abre certinha | pc-safari | ok | 5.0 s |
| página /termos-organizador abre certinha | notebook-pequeno | ok | 3.9 s |
| página /termos-organizador abre certinha | iphone-se | FALHOU | 6.0 s |
| página /termos-organizador abre certinha | iphone-15 | FALHOU | 7.1 s |
| página /termos-organizador abre certinha | android-pixel | FALHOU | 5.4 s |
| página /termos-organizador abre certinha | android-pequeno | FALHOU | 6.1 s |
| página /termos-organizador abre certinha | tablet-ipad | ok | 5.4 s |
| página /app abre certinha | pc-chrome | ok | 3.9 s |
| página /app abre certinha | pc-firefox | ok | 5.0 s |
| página /app abre certinha | pc-safari | FALHOU | 78.8 s |
| página /app abre certinha | notebook-pequeno | ok | 3.1 s |
| página /app abre certinha | iphone-se | FALHOU | 4.8 s |
| página /app abre certinha | iphone-15 | FALHOU | 5.2 s |
| página /app abre certinha | android-pixel | FALHOU | 4.1 s |
| página /app abre certinha | android-pequeno | FALHOU | 4.5 s |
| página /app abre certinha | tablet-ipad | ok | 4.7 s |
| páginas de cada evento de teste | pc-chrome | ok | 25.3 s |
| páginas de cada evento de teste | pc-firefox | ok | 39.4 s |
| páginas de cada evento de teste | pc-safari | FALHOU | 45.5 s |
| páginas de cada evento de teste | notebook-pequeno | ok | 24.0 s |
| páginas de cada evento de teste | iphone-se | ok | 27.0 s |
| páginas de cada evento de teste | iphone-15 | ok | 32.0 s |
| páginas de cada evento de teste | android-pixel | ok | 27.7 s |
| páginas de cada evento de teste | android-pequeno | FALHOU | 32.9 s |
| páginas de cada evento de teste | tablet-ipad | ok | 39.8 s |
| evento privado não aparece na lista nem na busca | pc-chrome | ok | 1.7 s |
| evento privado não aparece na lista nem na busca | pc-firefox | ok | 2.6 s |
| evento privado não aparece na lista nem na busca | pc-safari | ok | 5.9 s |
| evento privado não aparece na lista nem na busca | notebook-pequeno | ok | 1.7 s |
| evento privado não aparece na lista nem na busca | iphone-se | ok | 2.9 s |
| evento privado não aparece na lista nem na busca | iphone-15 | ok | 3.0 s |
| evento privado não aparece na lista nem na busca | android-pixel | ok | 2.0 s |
| evento privado não aparece na lista nem na busca | android-pequeno | ok | 2.5 s |
| evento privado não aparece na lista nem na busca | tablet-ipad | ok | 3.6 s |
| eventos de teste aparecem na lista de eventos | pc-chrome | ok | 1.1 s |
| eventos de teste aparecem na lista de eventos | pc-firefox | ok | 1.8 s |
| eventos de teste aparecem na lista de eventos | pc-safari | ok | 5.3 s |
| eventos de teste aparecem na lista de eventos | notebook-pequeno | ok | 1.2 s |
| eventos de teste aparecem na lista de eventos | iphone-se | ok | 1.7 s |
| eventos de teste aparecem na lista de eventos | iphone-15 | ok | 3.6 s |
| eventos de teste aparecem na lista de eventos | android-pixel | ok | 1.2 s |
| eventos de teste aparecem na lista de eventos | android-pequeno | ok | 1.8 s |
| eventos de teste aparecem na lista de eventos | tablet-ipad | ok | 2.4 s |
| página que não existe mostra aviso amigável (404) | pc-chrome | ok | 0.7 s |
| página que não existe mostra aviso amigável (404) | pc-firefox | ok | 1.6 s |
| página que não existe mostra aviso amigável (404) | pc-safari | ok | 4.1 s |
| página que não existe mostra aviso amigável (404) | notebook-pequeno | ok | 0.8 s |
| página que não existe mostra aviso amigável (404) | iphone-se | ok | 1.1 s |
| página que não existe mostra aviso amigável (404) | iphone-15 | ok | 2.0 s |
| página que não existe mostra aviso amigável (404) | android-pixel | ok | 0.8 s |
| página que não existe mostra aviso amigável (404) | android-pequeno | ok | 1.4 s |
| página que não existe mostra aviso amigável (404) | tablet-ipad | ok | 1.7 s |
| evento inexistente mostra aviso e não quebra | pc-chrome | ok | 0.9 s |
| evento inexistente mostra aviso e não quebra | pc-firefox | ok | 1.7 s |
| evento inexistente mostra aviso e não quebra | pc-safari | ok | 2.4 s |
| evento inexistente mostra aviso e não quebra | notebook-pequeno | ok | 0.7 s |
| evento inexistente mostra aviso e não quebra | iphone-se | ok | 1.6 s |
| evento inexistente mostra aviso e não quebra | iphone-15 | ok | 1.7 s |
| evento inexistente mostra aviso e não quebra | android-pixel | ok | 0.8 s |
| evento inexistente mostra aviso e não quebra | android-pequeno | ok | 1.0 s |
| evento inexistente mostra aviso e não quebra | tablet-ipad | ok | 1.6 s |
| Meus ingressos sem conta pede para entrar | pc-chrome | ok | 5.7 s |
| Meus ingressos sem conta pede para entrar | pc-firefox | ok | 9.6 s |
| Meus ingressos sem conta pede para entrar | pc-safari | ok | 3.0 s |
| Meus ingressos sem conta pede para entrar | notebook-pequeno | ok | 0.8 s |
| Meus ingressos sem conta pede para entrar | iphone-se | ok | 1.2 s |
| Meus ingressos sem conta pede para entrar | iphone-15 | ok | 1.6 s |
| Meus ingressos sem conta pede para entrar | android-pixel | ok | 1.4 s |
| Meus ingressos sem conta pede para entrar | android-pequeno | ok | 1.4 s |
| Meus ingressos sem conta pede para entrar | tablet-ipad | ok | 1.9 s |
| páginas da conta logada | pc-chrome | ok | 9.1 s |
| páginas da conta logada | pc-firefox | ok | 15.1 s |
| páginas da conta logada | pc-safari | FALHOU | 78.2 s |
| páginas da conta logada | notebook-pequeno | ok | 9.4 s |
| páginas da conta logada | iphone-se | FALHOU | 12.5 s |
| páginas da conta logada | iphone-15 | FALHOU | 14.7 s |
| páginas da conta logada | android-pixel | FALHOU | 11.3 s |
| páginas da conta logada | android-pequeno | FALHOU | 12.2 s |
| páginas da conta logada | tablet-ipad | ok | 14.8 s |
| menu e rodapé: todos os links internos abrem | pc-chrome | ok | 1.9 s |
| menu e rodapé: todos os links internos abrem | pc-firefox | ok | 3.5 s |
| menu e rodapé: todos os links internos abrem | pc-safari | ok | 6.0 s |
| menu e rodapé: todos os links internos abrem | notebook-pequeno | ok | 2.1 s |
| menu e rodapé: todos os links internos abrem | iphone-se | ok | 3.6 s |
| menu e rodapé: todos os links internos abrem | iphone-15 | ok | 3.4 s |
| menu e rodapé: todos os links internos abrem | android-pixel | ok | 2.9 s |
| menu e rodapé: todos os links internos abrem | android-pequeno | ok | 2.8 s |
| menu e rodapé: todos os links internos abrem | tablet-ipad | ok | 5.5 s |
| busca com textos estranhos não quebra | pc-chrome | ok | 4.8 s |
| busca com textos estranhos não quebra | pc-firefox | ok | 9.3 s |
| busca com textos estranhos não quebra | pc-safari | FALHOU | 7.3 s |
| busca com textos estranhos não quebra | notebook-pequeno | ok | 4.0 s |
| busca com textos estranhos não quebra | iphone-se | FALHOU | 6.3 s |
| busca com textos estranhos não quebra | iphone-15 | FALHOU | 7.1 s |
| busca com textos estranhos não quebra | android-pixel | ok | 5.1 s |
| busca com textos estranhos não quebra | android-pequeno | ok | 5.9 s |
| busca com textos estranhos não quebra | tablet-ipad | FALHOU | 10.4 s |
| buscar pelo campo da página inicial | pc-chrome | ok | 1.5 s |
| buscar pelo campo da página inicial | pc-firefox | ok | 3.7 s |
| buscar pelo campo da página inicial | pc-safari | ok | 5.8 s |
| buscar pelo campo da página inicial | notebook-pequeno | ok | 1.6 s |
| buscar pelo campo da página inicial | iphone-se | ok | 3.7 s |
| buscar pelo campo da página inicial | iphone-15 | ok | 4.4 s |
| buscar pelo campo da página inicial | android-pixel | ok | 2.3 s |
| buscar pelo campo da página inicial | android-pequeno | ok | 2.5 s |
| buscar pelo campo da página inicial | tablet-ipad | ok | 5.5 s |
| filtro por categoria leva para a lista filtrada | pc-chrome | ok | 1.8 s |
| filtro por categoria leva para a lista filtrada | pc-firefox | ok | 4.1 s |
| filtro por categoria leva para a lista filtrada | pc-safari | ok | 3.7 s |
| filtro por categoria leva para a lista filtrada | notebook-pequeno | ok | 1.5 s |
| filtro por categoria leva para a lista filtrada | iphone-se | ok | 3.8 s |
| filtro por categoria leva para a lista filtrada | iphone-15 | ok | 5.1 s |
| filtro por categoria leva para a lista filtrada | android-pixel | ok | 2.1 s |
| filtro por categoria leva para a lista filtrada | android-pequeno | ok | 2.6 s |
| filtro por categoria leva para a lista filtrada | tablet-ipad | ok | 5.6 s |
