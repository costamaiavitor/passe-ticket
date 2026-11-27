# Resultado da caça a bugs

513 execuções (testes × aparelhos): **242 ok**, **261 com problema**, 10 puladas.

## Problemas por teste

### app-e-rede.spec.ts › sem internet na porta: o ingresso abre com o QR Code
Aparelhos: pc-safari

- Error: expect(locator).toHaveCount(expected) failed ⏎ Locator:  locator('article') ⏎ Expected: 1 ⏎ Received: 0 ⏎ Timeout:  10000ms ⏎ Call log:

### compra.spec.ts › compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [checkout] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [meus ingressos com 2 ingressos] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  -  1 ⏎ + Received  + 10 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  -  1 ⏎ + Received  + 10 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText('QA Festa Principal').first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:

### compra.spec.ts › misturar Pista, Meia e Camarote na mesma compra soma certo
Aparelhos: iphone-15

- Error: expect(locator).toContainText(expected) failed ⏎ Locator: locator('#ingressos') ⏎ Expected substring: "R$ 216,45" ⏎ Received string:    "IngressosPista — 1º loteR$ 50,000Meia-entrada — 1º loteR$ 25,001Camarote — 1º loteR$ 120,001Dá para juntar categorias diferentes na mesma compra (até 10 ingressos). Cada ingresso exige um titular com CPF próprio (máx. 4 por CPF).1× Meia-entrada — 1º loteR$ 25,001× Camarote — 1º loteR$ 120,00Subtotal (2 ingressos)R$ 145,00Taxa da plataforma (11%)R$ 15,95TotalR$ 160,95Tenho um cupom de descontoContinuar" ⏎ Timeout: 10000ms ⏎ Call log:

### compra.spec.ts › sem conta: 'Entrar para comprar' leva ao login e volta para o evento
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input id="_r_1_" required="" type="password" name="password" autocomplete="current-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎   68 |   await expect(page).toHaveURL(/entrar/);

### compra.spec.ts › evento privado: senha errada não libera, senha certa libera os ingressos
Aparelhos: pc-safari, iphone-se, iphone-15, tablet-ipad

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/incorret|inválid|errad|não confere/i).first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:

### compra.spec.ts › evento grátis: dá para pegar ingresso sem pagar
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText('QA Entrada Grátis').first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:

### compra.spec.ts › pedido de outra pessoa não abre
Aparelhos: pc-chrome, notebook-pequeno, android-pixel, android-pequeno

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › devolver a compra em Meus ingressos cancela os ingressos
Aparelhos: pc-safari

- Error: expect(locator).toHaveCount(expected) failed ⏎ Locator:  locator('article') ⏎ Expected: 1 ⏎ Received: 0 ⏎ Timeout:  10000ms ⏎ Call log:

### compra.spec.ts › transferir ingresso: a outra pessoa recebe e aceita
Aparelhos: pc-safari

- Test timeout of 60000ms exceeded.
- Error: locator.click: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - waiting for getByRole('button', { name: /transferir/i }).first() ⏎   237 |   await buyPaid(me.token, s.main.id, s.main.pista, [{ name: me.name, cpf: me.cpf }]); ⏎   238 |   await page.goto("/ingressos"); ⏎ > 239 |   await page.getByRole("button", { name: /transferir/i }).first().click();

### compra.spec.ts › nomes com acento, emoji e muito compridos aparecem direito no ingresso
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [ingressos com nomes difíceis] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText('José Antônio da Conceição Ñuñez').first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:
- Error: [ingressos com nomes difíceis] A página tem rolagem para o lado (171px a mais que a tela). Elementos: div.ml-auto.flex.items-center (171px fora) "Criar evento ⏎ Meus ingressos" | a.inline-flex.items-center.justify-center (75px fora) "Meus ingressos" | span.hidden.min-[400px]:inline (63px fora) "Meus ingressos" | a.items-center.justify-center.gap-2 (123px fora) "" | svg (113px fora) "" | button.items-center.justify-center.gap-2 (171px fora) "" | svg (161px fora) "" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    171 ⏎    at ../fixtures.ts:87
- Error: [ingressos com nomes difíceis] Elementos saindo da tela ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  -  1 ⏎ + Received  + 10 ⏎ - Array [] ⏎ + Array [
- Error: [ingressos com nomes difíceis] A página tem rolagem para o lado (164px a mais que a tela). Elementos: div.ml-auto.flex.items-center (164px fora) "Criar evento ⏎ Meus ingressos" | a.inline-flex.items-center.justify-center (68px fora) "Meus ingressos" | span.hidden.min-[400px]:inline (56px fora) "Meus ingressos" | a.items-center.justify-center.gap-2 (116px fora) "" | svg (106px fora) "" | button.items-center.justify-center.gap-2 (164px fora) "" | svg (154px fora) "" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    164 ⏎    at ../fixtures.ts:87

### compra.spec.ts › nome de titular com código malicioso não roda no navegador (XSS)
Aparelhos: pc-safari

- Test timeout of 60000ms exceeded.
- Error: page.waitForLoadState: Test timeout of 60000ms exceeded. ⏎   270 |   await buyPaid(me.token, s.main.id, s.main.meia, [{ name: evil, cpf: cpf() }]); ⏎   271 |   await page.goto("/ingressos"); ⏎ > 272 |   await page.waitForLoadState("networkidle"); ⏎       |              ^ ⏎   273 |   expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();

### conta.spec.ts › cadastro novo pela tela entra direto na conta
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" minlength="8" id="_R_2a5aq_" type="password" name="password" autocomplete="new-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎    9 |   await page.getByLabel("E-mail").fill(d.email);

### conta.spec.ts › cadastro com CPF digitado sem pontos também funciona
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" minlength="8" id="_R_2a5aq_" type="password" name="password" autocomplete="new-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎    9 |   await page.getByLabel("E-mail").fill(d.email);

### conta.spec.ts › cadastro com CPF inválido mostra erro claro
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" minlength="8" id="_R_2a5aq_" type="password" name="password" autocomplete="new-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎    9 |   await page.getByLabel("E-mail").fill(d.email);

### conta.spec.ts › cadastro com e-mail já usado avisa
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" minlength="8" id="_R_2a5aq_" type="password" name="password" autocomplete="new-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎    9 |   await page.getByLabel("E-mail").fill(d.email);

### conta.spec.ts › cadastro com CPF já usado avisa
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" minlength="8" id="_R_2a5aq_" type="password" name="password" autocomplete="new-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎    9 |   await page.getByLabel("E-mail").fill(d.email);

### conta.spec.ts › cadastro com senha curta não passa
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" minlength="8" id="_R_2a5aq_" type="password" name="password" autocomplete="new-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎    9 |   await page.getByLabel("E-mail").fill(d.email);

### conta.spec.ts › cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" minlength="8" id="_R_2a5aq_" type="password" name="password" autocomplete="new-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎    9 |   await page.getByLabel("E-mail").fill(d.email);

### conta.spec.ts › login com senha errada mostra erro e não entra
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" id="_R_1a5aq_" type="password" name="password" autocomplete="current-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎   70 |   await page.goto("/entrar");

### conta.spec.ts › login certo, recarregar a página continua logado, e sair funciona
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" id="_R_1a5aq_" type="password" name="password" autocomplete="current-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎   80 |   await page.goto("/entrar");

### conta.spec.ts › página protegida manda para o login e volta depois
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Test timeout of 60000ms exceeded.
- Error: locator.click: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - waiting for getByRole('link', { name: /entrar/i }).or(getByRole('button', { name: /entrar/i })).first() ⏎   100 |   await page.goto("/ingressos"); ⏎   101 |   const entrar = page.getByRole("link", { name: /entrar/i }).or(page.getByRole("button", { name: /entrar/i })); ⏎ > 102 |   await entrar.first().click();
- Error: locator.click: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - waiting for getByRole('link', { name: /entrar/i }).or(getByRole('button', { name: /entrar/i })).first() ⏎     - locator resolved to <a href="/entrar" class="inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-200 active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foregrou…>Entrar</a> ⏎   - attempting click action ⏎     - waiting for element to be visible, enabled and stable

### conta.spec.ts › mostrar/ocultar senha funciona
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: locator.fill: Error: strict mode violation: getByLabel('Senha') resolved to 2 elements: ⏎     1) <input required="" id="_R_1a5aq_" type="password" name="password" autocomplete="current-password" class="h-11 w-full rounded-md border bg-card px-3 text-sm outline-none transition-[border-color,box-shadow] duration-200 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(160_61_253/0.14)] pr-11"/> aka getByRole('textbox', { name: 'Senha' }) ⏎     2) <button type="button" aria-pressed="false" aria-label="Mostrar senha" class="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground">…</button> aka getByRole('button', { name: 'Mostrar senha' }) ⏎ Call log: ⏎   - waiting for getByLabel('Senha') ⏎   118 |   await page.goto("/entrar");

### paginas.spec.ts › página / abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/] A página tem rolagem para o lado (75px a mais que a tela). Elementos: div.ml-auto.flex.items-center (75px fora) "Criar evento ⏎ Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (75px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    75
- Error: [/] Elementos saindo da tela ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [
- Error: [/] A página tem rolagem para o lado (45px a mais que a tela). Elementos: div.ml-auto.flex.items-center (45px fora) "Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (45px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    45 ⏎    at ../fixtures.ts:87

### paginas.spec.ts › página /eventos abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/eventos] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 5 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/eventos] A página tem rolagem para o lado (75px a mais que a tela). Elementos: div.ml-auto.flex.items-center (75px fora) "Criar evento ⏎ Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (75px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    75
- Error: [/eventos] Elementos saindo da tela ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [
- Error: [/eventos] A página tem rolagem para o lado (45px a mais que a tela). Elementos: div.ml-auto.flex.items-center (45px fora) "Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (45px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    45 ⏎    at ../fixtures.ts:87

### paginas.spec.ts › página /entrar abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/entrar] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/entrar] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /cadastro abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/cadastro] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/cadastro] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/cadastro] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 5 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /esqueci-senha abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/esqueci-senha] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/esqueci-senha] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página /termos abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/termos] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/termos] A página tem rolagem para o lado (75px a mais que a tela). Elementos: div.ml-auto.flex.items-center (75px fora) "Criar evento ⏎ Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (75px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    75
- Error: [/termos] Elementos saindo da tela ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [
- Error: [/termos] A página tem rolagem para o lado (45px a mais que a tela). Elementos: div.ml-auto.flex.items-center (45px fora) "Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (45px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    45 ⏎    at ../fixtures.ts:87

### paginas.spec.ts › página /privacidade abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/privacidade] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/privacidade] A página tem rolagem para o lado (75px a mais que a tela). Elementos: div.ml-auto.flex.items-center (75px fora) "Criar evento ⏎ Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (75px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    75
- Error: [/privacidade] Elementos saindo da tela ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [
- Error: [/privacidade] A página tem rolagem para o lado (222px a mais que a tela). Elementos: div.ml-auto.flex.items-center (45px fora) "Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (45px fora) "Criar conta" | div.max-w-3xl (222px fora) "Política de Privacidade ⏎ Última atualiza" | h1.text-3xl.font-semibold.tracking-tight (222px fora) "Política de Privacidade" | span (10px fora) "Política de Privacidade" | span.m-word (10px fora) "Privacidade" | div.m-rise. (222px fora) "Última atualização: 25 de novembro de 20" | p.mt-2.text-sm.text-muted-foreground (222px fora) "Última atualização: 25 de novembro de 20" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    222

### paginas.spec.ts › página /termos-organizador abre certinha
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/termos-organizador] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: [/termos-organizador] A página tem rolagem para o lado (75px a mais que a tela). Elementos: div.ml-auto.flex.items-center (75px fora) "Criar evento ⏎ Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (75px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    75
- Error: [/termos-organizador] Elementos saindo da tela ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [
- Error: [/termos-organizador] A página tem rolagem para o lado (45px a mais que a tela). Elementos: div.ml-auto.flex.items-center (45px fora) "Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (45px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    45 ⏎    at ../fixtures.ts:87

### paginas.spec.ts › página /app abre certinha
Aparelhos: pc-chrome, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [
- Test timeout of 60000ms exceeded.
- Error: page.evaluate: Test timeout of 60000ms exceeded. ⏎    at ../fixtures.ts:47 ⏎   45 |   await page.waitForLoadState("networkidle").catch(() => undefined); ⏎   46 |   // Rola até o fim para carregar tudo o que aparece ao rolar (animações de entrada, imagens). ⏎ > 47 |   await page.evaluate(async () => { ⏎      |              ^
- Error: [/app] A página tem rolagem para o lado (75px a mais que a tela). Elementos: div.ml-auto.flex.items-center (75px fora) "Criar evento ⏎ Entrar ⏎ Criar conta" | a.inline-flex.items-center.justify-center (75px fora) "Criar conta" ⏎ expect(received).toBeLessThanOrEqual(expected) ⏎ Expected: <= 1 ⏎ Received:    75
- Error: [/app] Elementos saindo da tela ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 6 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › páginas de cada evento de teste
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [evento QA Festa Principal] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Esgotado] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Festival Internacional de Música Eletrônica e Artes Visuais com Convidados Especiais Edição de Verão Superlonga 2027] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Entrada Grátis] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [evento QA Últimos Ingressos] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  -  1 ⏎ + Received  + 22 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › página que não existe mostra aviso amigável (404)
Aparelhos: pc-chrome, notebook-pequeno, android-pixel, android-pequeno

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › evento inexistente mostra aviso e não quebra
Aparelhos: pc-chrome, notebook-pequeno, android-pixel, android-pequeno

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › Meus ingressos sem conta pede para entrar
Aparelhos: pc-firefox

- Test timeout of 60000ms exceeded.
- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/entrar|faça login/i).first() ⏎ Expected: visible ⏎ Error: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - Expect "toBeVisible" getByText(/entrar|faça login/i).first() with timeout 10000ms

### paginas.spec.ts › páginas da conta logada
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Error: [/ingressos (logado)] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: [/conta (logado)] Acessibilidade (problemas graves) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 8 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 8 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Test timeout of 60000ms exceeded.

### paginas.spec.ts › busca com textos estranhos não quebra
Aparelhos: pc-chrome, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  -  1 ⏎ + Received  + 10 ⏎ - Array [] ⏎ + Array [
- Error: Chamadas que falharam (5xx / arquivo não encontrado) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  -  1 ⏎ + Received  + 10 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

## Medições

- sem internet na porta: o ingresso abre com o QR Code (pc-firefox): skip: o Firefox do Playwright não simula sem-internet com service worker
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-chrome): tempo-3g: 28 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-firefox): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-safari): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (notebook-pequeno): tempo-3g: 28 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (iphone-se): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (iphone-15): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (android-pixel): tempo-3g: 27 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (android-pequeno): tempo-3g: 27 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (tablet-ipad): skip: simulação de 3G só existe no Chrome
- página /app: botão de instalar ou passo a passo aparece no celular (pc-chrome): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (pc-firefox): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (pc-safari): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (notebook-pequeno): skip: só no celular

## Todas as execuções

| Teste | Aparelho | Resultado | Tempo |
|---|---|---|---|
| sem internet na porta: o ingresso abre com o QR Code | pc-chrome | ok | 2.3 s |
| sem internet na porta: o ingresso abre com o QR Code | pc-firefox | pulado | 1.9 s |
| sem internet na porta: o ingresso abre com o QR Code | pc-safari | FALHOU | 25.9 s |
| sem internet na porta: o ingresso abre com o QR Code | notebook-pequeno | ok | 1.5 s |
| sem internet na porta: o ingresso abre com o QR Code | iphone-se | ok | 2.5 s |
| sem internet na porta: o ingresso abre com o QR Code | iphone-15 | ok | 2.5 s |
| sem internet na porta: o ingresso abre com o QR Code | android-pixel | ok | 2.2 s |
| sem internet na porta: o ingresso abre com o QR Code | android-pequeno | ok | 1.7 s |
| sem internet na porta: o ingresso abre com o QR Code | tablet-ipad | ok | 2.6 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-chrome | ok | 27.9 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-firefox | pulado | 2.0 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-safari | pulado | 0.8 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | notebook-pequeno | ok | 28.0 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | iphone-se | pulado | 0.6 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | iphone-15 | pulado | 0.7 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | android-pixel | ok | 27.9 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | android-pequeno | ok | 27.8 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | tablet-ipad | pulado | 0.7 s |
| voltar e avançar no navegador não quebra a compra | pc-chrome | ok | 4.3 s |
| voltar e avançar no navegador não quebra a compra | pc-firefox | ok | 6.0 s |
| voltar e avançar no navegador não quebra a compra | pc-safari | ok | 6.5 s |
| voltar e avançar no navegador não quebra a compra | notebook-pequeno | ok | 2.6 s |
| voltar e avançar no navegador não quebra a compra | iphone-se | ok | 3.9 s |
| voltar e avançar no navegador não quebra a compra | iphone-15 | ok | 4.9 s |
| voltar e avançar no navegador não quebra a compra | android-pixel | ok | 4.2 s |
| voltar e avançar no navegador não quebra a compra | android-pequeno | ok | 3.7 s |
| voltar e avançar no navegador não quebra a compra | tablet-ipad | ok | 5.8 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-chrome | ok | 1.8 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-firefox | ok | 4.4 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-safari | ok | 1.5 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | notebook-pequeno | ok | 0.4 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | iphone-se | ok | 1.8 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | iphone-15 | ok | 1.7 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | android-pixel | ok | 1.7 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | android-pequeno | ok | 0.9 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | tablet-ipad | ok | 2.3 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-chrome | pulado | 0.2 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-firefox | pulado | 1.1 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-safari | pulado | 0.6 s |
| página /app: botão de instalar ou passo a passo aparece no celular | notebook-pequeno | pulado | 0.1 s |
| página /app: botão de instalar ou passo a passo aparece no celular | iphone-se | ok | 1.6 s |
| página /app: botão de instalar ou passo a passo aparece no celular | iphone-15 | ok | 1.7 s |
| página /app: botão de instalar ou passo a passo aparece no celular | android-pixel | ok | 0.8 s |
| página /app: botão de instalar ou passo a passo aparece no celular | android-pequeno | ok | 0.8 s |
| página /app: botão de instalar ou passo a passo aparece no celular | tablet-ipad | ok | 2.4 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-chrome | ok | 0.0 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-firefox | ok | 0.1 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-safari | ok | 0.0 s |
| compartilhar link do evento: a prévia tem título e imagem | notebook-pequeno | ok | 0.0 s |
| compartilhar link do evento: a prévia tem título e imagem | iphone-se | ok | 0.1 s |
| compartilhar link do evento: a prévia tem título e imagem | iphone-15 | ok | 0.1 s |
| compartilhar link do evento: a prévia tem título e imagem | android-pixel | ok | 0.1 s |
| compartilhar link do evento: a prévia tem título e imagem | android-pequeno | ok | 0.0 s |
| compartilhar link do evento: a prévia tem título e imagem | tablet-ipad | ok | 0.1 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-chrome | FALHOU | 8.8 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-firefox | FALHOU | 17.1 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-safari | FALHOU | 28.2 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | notebook-pequeno | FALHOU | 5.9 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | iphone-se | FALHOU | 13.4 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | iphone-15 | FALHOU | 13.0 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | android-pixel | FALHOU | 8.9 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | android-pequeno | FALHOU | 9.1 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | tablet-ipad | FALHOU | 16.2 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-chrome | ok | 2.7 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-firefox | ok | 5.2 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-safari | ok | 4.6 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | notebook-pequeno | ok | 2.4 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | iphone-se | ok | 4.8 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | iphone-15 | FALHOU | 14.6 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | android-pixel | ok | 2.3 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | android-pequeno | ok | 3.3 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | tablet-ipad | ok | 7.2 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-chrome | FALHOU | 2.5 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-firefox | FALHOU | 4.9 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-safari | FALHOU | 13.6 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | notebook-pequeno | FALHOU | 2.5 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | iphone-se | FALHOU | 4.0 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | iphone-15 | FALHOU | 5.5 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | android-pixel | FALHOU | 2.6 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | android-pequeno | FALHOU | 2.4 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | tablet-ipad | FALHOU | 7.1 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-chrome | ok | 2.4 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-firefox | ok | 4.9 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-safari | ok | 4.7 s |
| titular com CPF inválido: mostra erro e não cria pedido | notebook-pequeno | ok | 2.2 s |
| titular com CPF inválido: mostra erro e não cria pedido | iphone-se | ok | 4.7 s |
| titular com CPF inválido: mostra erro e não cria pedido | iphone-15 | ok | 3.9 s |
| titular com CPF inválido: mostra erro e não cria pedido | android-pixel | ok | 2.9 s |
| titular com CPF inválido: mostra erro e não cria pedido | android-pequeno | ok | 2.3 s |
| titular com CPF inválido: mostra erro e não cria pedido | tablet-ipad | ok | 5.3 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-chrome | ok | 3.5 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-firefox | ok | 7.0 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-safari | ok | 5.6 s |
| sem marcar o aceite dos Termos não vai para o pagamento | notebook-pequeno | ok | 2.9 s |
| sem marcar o aceite dos Termos não vai para o pagamento | iphone-se | ok | 5.5 s |
| sem marcar o aceite dos Termos não vai para o pagamento | iphone-15 | ok | 4.7 s |
| sem marcar o aceite dos Termos não vai para o pagamento | android-pixel | ok | 3.6 s |
| sem marcar o aceite dos Termos não vai para o pagamento | android-pequeno | ok | 3.0 s |
| sem marcar o aceite dos Termos não vai para o pagamento | tablet-ipad | ok | 6.6 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-chrome | ok | 4.2 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-firefox | ok | 6.4 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-safari | ok | 10.3 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | notebook-pequeno | ok | 3.3 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | iphone-se | ok | 5.6 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | iphone-15 | ok | 8.8 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | android-pixel | ok | 4.2 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | android-pequeno | ok | 4.0 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | tablet-ipad | ok | 8.4 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-chrome | ok | 2.7 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-firefox | ok | 4.6 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-safari | ok | 6.9 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | notebook-pequeno | ok | 2.2 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | iphone-se | ok | 4.4 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | iphone-15 | ok | 6.4 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | android-pixel | ok | 3.1 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | android-pequeno | ok | 2.3 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | tablet-ipad | ok | 6.5 s |
| evento esgotado não deixa comprar e avisa | pc-chrome | ok | 1.6 s |
| evento esgotado não deixa comprar e avisa | pc-firefox | ok | 6.0 s |
| evento esgotado não deixa comprar e avisa | pc-safari | ok | 2.6 s |
| evento esgotado não deixa comprar e avisa | notebook-pequeno | ok | 1.5 s |
| evento esgotado não deixa comprar e avisa | iphone-se | ok | 2.2 s |
| evento esgotado não deixa comprar e avisa | iphone-15 | ok | 2.4 s |
| evento esgotado não deixa comprar e avisa | android-pixel | ok | 1.5 s |
| evento esgotado não deixa comprar e avisa | android-pequeno | ok | 1.6 s |
| evento esgotado não deixa comprar e avisa | tablet-ipad | ok | 2.6 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-chrome | ok | 2.5 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-firefox | ok | 4.3 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-safari | ok | 5.4 s |
| últimos ingressos: não deixa escolher mais do que tem | notebook-pequeno | ok | 2.5 s |
| últimos ingressos: não deixa escolher mais do que tem | iphone-se | ok | 2.7 s |
| últimos ingressos: não deixa escolher mais do que tem | iphone-15 | ok | 4.2 s |
| últimos ingressos: não deixa escolher mais do que tem | android-pixel | ok | 2.7 s |
| últimos ingressos: não deixa escolher mais do que tem | android-pequeno | ok | 2.9 s |
| últimos ingressos: não deixa escolher mais do que tem | tablet-ipad | ok | 5.2 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-chrome | ok | 2.2 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-firefox | ok | 4.9 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-safari | FALHOU | 14.3 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | notebook-pequeno | ok | 1.9 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | iphone-se | FALHOU | 12.9 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | iphone-15 | FALHOU | 13.4 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | android-pixel | ok | 2.6 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | android-pequeno | ok | 2.6 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | tablet-ipad | FALHOU | 14.3 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-chrome | FALHOU | 13.6 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-firefox | FALHOU | 17.2 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-safari | FALHOU | 23.5 s |
| evento grátis: dá para pegar ingresso sem pagar | notebook-pequeno | FALHOU | 12.6 s |
| evento grátis: dá para pegar ingresso sem pagar | iphone-se | FALHOU | 13.9 s |
| evento grátis: dá para pegar ingresso sem pagar | iphone-15 | FALHOU | 15.1 s |
| evento grátis: dá para pegar ingresso sem pagar | android-pixel | FALHOU | 13.0 s |
| evento grátis: dá para pegar ingresso sem pagar | android-pequeno | FALHOU | 13.4 s |
| evento grátis: dá para pegar ingresso sem pagar | tablet-ipad | FALHOU | 16.6 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-chrome | ok | 2.7 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-firefox | ok | 7.9 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-safari | ok | 5.3 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | notebook-pequeno | ok | 2.1 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | iphone-se | ok | 4.4 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | iphone-15 | ok | 5.1 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | android-pixel | ok | 2.5 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | android-pequeno | ok | 2.2 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | tablet-ipad | ok | 5.6 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-chrome | ok | 3.7 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-firefox | ok | 6.1 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-safari | ok | 4.8 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | notebook-pequeno | ok | 3.0 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | iphone-se | ok | 4.3 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | iphone-15 | ok | 5.3 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | android-pixel | ok | 3.8 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | android-pequeno | ok | 2.9 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | tablet-ipad | ok | 5.5 s |
| recarregar a página do pagamento não perde o pedido | pc-chrome | ok | 2.5 s |
| recarregar a página do pagamento não perde o pedido | pc-firefox | ok | 6.1 s |
| recarregar a página do pagamento não perde o pedido | pc-safari | ok | 5.2 s |
| recarregar a página do pagamento não perde o pedido | notebook-pequeno | ok | 2.2 s |
| recarregar a página do pagamento não perde o pedido | iphone-se | ok | 3.6 s |
| recarregar a página do pagamento não perde o pedido | iphone-15 | ok | 4.3 s |
| recarregar a página do pagamento não perde o pedido | android-pixel | ok | 3.0 s |
| recarregar a página do pagamento não perde o pedido | android-pequeno | ok | 2.8 s |
| recarregar a página do pagamento não perde o pedido | tablet-ipad | ok | 5.2 s |
| pedido de outra pessoa não abre | pc-chrome | FALHOU | 0.6 s |
| pedido de outra pessoa não abre | pc-firefox | ok | 1.9 s |
| pedido de outra pessoa não abre | pc-safari | ok | 1.6 s |
| pedido de outra pessoa não abre | notebook-pequeno | FALHOU | 1.1 s |
| pedido de outra pessoa não abre | iphone-se | ok | 0.9 s |
| pedido de outra pessoa não abre | iphone-15 | ok | 1.9 s |
| pedido de outra pessoa não abre | android-pixel | FALHOU | 1.1 s |
| pedido de outra pessoa não abre | android-pequeno | FALHOU | 1.3 s |
| pedido de outra pessoa não abre | tablet-ipad | ok | 1.1 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-chrome | ok | 1.3 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-firefox | ok | 2.6 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-safari | FALHOU | 24.1 s |
| devolver a compra em Meus ingressos cancela os ingressos | notebook-pequeno | ok | 1.9 s |
| devolver a compra em Meus ingressos cancela os ingressos | iphone-se | ok | 1.5 s |
| devolver a compra em Meus ingressos cancela os ingressos | iphone-15 | ok | 4.3 s |
| devolver a compra em Meus ingressos cancela os ingressos | android-pixel | ok | 1.2 s |
| devolver a compra em Meus ingressos cancela os ingressos | android-pequeno | ok | 1.7 s |
| devolver a compra em Meus ingressos cancela os ingressos | tablet-ipad | ok | 2.2 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-chrome | ok | 2.4 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-firefox | ok | 5.1 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-safari | FALHOU | 70.1 s |
| transferir ingresso: a outra pessoa recebe e aceita | notebook-pequeno | ok | 5.3 s |
| transferir ingresso: a outra pessoa recebe e aceita | iphone-se | ok | 4.2 s |
| transferir ingresso: a outra pessoa recebe e aceita | iphone-15 | ok | 8.7 s |
| transferir ingresso: a outra pessoa recebe e aceita | android-pixel | ok | 5.4 s |
| transferir ingresso: a outra pessoa recebe e aceita | android-pequeno | ok | 4.3 s |
| transferir ingresso: a outra pessoa recebe e aceita | tablet-ipad | ok | 7.1 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-chrome | FALHOU | 3.3 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-firefox | FALHOU | 5.4 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-safari | FALHOU | 18.9 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | notebook-pequeno | FALHOU | 5.8 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | iphone-se | FALHOU | 5.9 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | iphone-15 | FALHOU | 8.0 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | android-pixel | FALHOU | 4.7 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | android-pequeno | FALHOU | 4.5 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | tablet-ipad | FALHOU | 5.9 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-chrome | ok | 1.1 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-firefox | ok | 3.5 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-safari | FALHOU | 70.3 s |
| nome de titular com código malicioso não roda no navegador (XSS) | notebook-pequeno | ok | 2.5 s |
| nome de titular com código malicioso não roda no navegador (XSS) | iphone-se | ok | 3.1 s |
| nome de titular com código malicioso não roda no navegador (XSS) | iphone-15 | ok | 3.4 s |
| nome de titular com código malicioso não roda no navegador (XSS) | android-pixel | ok | 2.0 s |
| nome de titular com código malicioso não roda no navegador (XSS) | android-pequeno | ok | 1.5 s |
| nome de titular com código malicioso não roda no navegador (XSS) | tablet-ipad | ok | 2.6 s |
| cadastro novo pela tela entra direto na conta | pc-chrome | FALHOU | 0.6 s |
| cadastro novo pela tela entra direto na conta | pc-firefox | FALHOU | 2.1 s |
| cadastro novo pela tela entra direto na conta | pc-safari | FALHOU | 4.1 s |
| cadastro novo pela tela entra direto na conta | notebook-pequeno | FALHOU | 1.3 s |
| cadastro novo pela tela entra direto na conta | iphone-se | FALHOU | 1.4 s |
| cadastro novo pela tela entra direto na conta | iphone-15 | FALHOU | 1.8 s |
| cadastro novo pela tela entra direto na conta | android-pixel | FALHOU | 1.3 s |
| cadastro novo pela tela entra direto na conta | android-pequeno | FALHOU | 1.1 s |
| cadastro novo pela tela entra direto na conta | tablet-ipad | FALHOU | 1.7 s |
| cadastro com CPF digitado sem pontos também funciona | pc-chrome | FALHOU | 0.7 s |
| cadastro com CPF digitado sem pontos também funciona | pc-firefox | FALHOU | 2.0 s |
| cadastro com CPF digitado sem pontos também funciona | pc-safari | FALHOU | 4.3 s |
| cadastro com CPF digitado sem pontos também funciona | notebook-pequeno | FALHOU | 2.0 s |
| cadastro com CPF digitado sem pontos também funciona | iphone-se | FALHOU | 1.9 s |
| cadastro com CPF digitado sem pontos também funciona | iphone-15 | FALHOU | 1.2 s |
| cadastro com CPF digitado sem pontos também funciona | android-pixel | FALHOU | 1.9 s |
| cadastro com CPF digitado sem pontos também funciona | android-pequeno | FALHOU | 2.0 s |
| cadastro com CPF digitado sem pontos também funciona | tablet-ipad | FALHOU | 2.6 s |
| cadastro com CPF inválido mostra erro claro | pc-chrome | FALHOU | 1.1 s |
| cadastro com CPF inválido mostra erro claro | pc-firefox | FALHOU | 5.1 s |
| cadastro com CPF inválido mostra erro claro | pc-safari | FALHOU | 5.0 s |
| cadastro com CPF inválido mostra erro claro | notebook-pequeno | FALHOU | 1.5 s |
| cadastro com CPF inválido mostra erro claro | iphone-se | FALHOU | 1.8 s |
| cadastro com CPF inválido mostra erro claro | iphone-15 | FALHOU | 1.5 s |
| cadastro com CPF inválido mostra erro claro | android-pixel | FALHOU | 1.6 s |
| cadastro com CPF inválido mostra erro claro | android-pequeno | FALHOU | 1.7 s |
| cadastro com CPF inválido mostra erro claro | tablet-ipad | FALHOU | 2.4 s |
| cadastro com e-mail já usado avisa | pc-chrome | FALHOU | 2.0 s |
| cadastro com e-mail já usado avisa | pc-firefox | FALHOU | 5.1 s |
| cadastro com e-mail já usado avisa | pc-safari | FALHOU | 5.1 s |
| cadastro com e-mail já usado avisa | notebook-pequeno | FALHOU | 2.1 s |
| cadastro com e-mail já usado avisa | iphone-se | FALHOU | 1.7 s |
| cadastro com e-mail já usado avisa | iphone-15 | FALHOU | 2.1 s |
| cadastro com e-mail já usado avisa | android-pixel | FALHOU | 1.4 s |
| cadastro com e-mail já usado avisa | android-pequeno | FALHOU | 1.5 s |
| cadastro com e-mail já usado avisa | tablet-ipad | FALHOU | 2.5 s |
| cadastro com CPF já usado avisa | pc-chrome | FALHOU | 1.7 s |
| cadastro com CPF já usado avisa | pc-firefox | FALHOU | 5.2 s |
| cadastro com CPF já usado avisa | pc-safari | FALHOU | 5.4 s |
| cadastro com CPF já usado avisa | notebook-pequeno | FALHOU | 3.1 s |
| cadastro com CPF já usado avisa | iphone-se | FALHOU | 2.2 s |
| cadastro com CPF já usado avisa | iphone-15 | FALHOU | 2.5 s |
| cadastro com CPF já usado avisa | android-pixel | FALHOU | 1.8 s |
| cadastro com CPF já usado avisa | android-pequeno | FALHOU | 1.7 s |
| cadastro com CPF já usado avisa | tablet-ipad | FALHOU | 1.8 s |
| cadastro com senha curta não passa | pc-chrome | FALHOU | 1.7 s |
| cadastro com senha curta não passa | pc-firefox | FALHOU | 5.0 s |
| cadastro com senha curta não passa | pc-safari | FALHOU | 5.2 s |
| cadastro com senha curta não passa | notebook-pequeno | FALHOU | 2.6 s |
| cadastro com senha curta não passa | iphone-se | FALHOU | 2.1 s |
| cadastro com senha curta não passa | iphone-15 | FALHOU | 2.8 s |
| cadastro com senha curta não passa | android-pixel | FALHOU | 2.1 s |
| cadastro com senha curta não passa | android-pequeno | FALHOU | 2.1 s |
| cadastro com senha curta não passa | tablet-ipad | FALHOU | 3.4 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-chrome | FALHOU | 1.8 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-firefox | FALHOU | 5.1 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-safari | FALHOU | 4.2 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | notebook-pequeno | FALHOU | 2.7 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | iphone-se | FALHOU | 2.2 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | iphone-15 | FALHOU | 2.9 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | android-pixel | FALHOU | 1.5 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | android-pequeno | FALHOU | 2.2 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | tablet-ipad | FALHOU | 1.9 s |
| login com senha errada mostra erro e não entra | pc-chrome | FALHOU | 1.6 s |
| login com senha errada mostra erro e não entra | pc-firefox | FALHOU | 5.0 s |
| login com senha errada mostra erro e não entra | pc-safari | FALHOU | 4.4 s |
| login com senha errada mostra erro e não entra | notebook-pequeno | FALHOU | 2.5 s |
| login com senha errada mostra erro e não entra | iphone-se | FALHOU | 1.9 s |
| login com senha errada mostra erro e não entra | iphone-15 | FALHOU | 2.3 s |
| login com senha errada mostra erro e não entra | android-pixel | FALHOU | 1.3 s |
| login com senha errada mostra erro e não entra | android-pequeno | FALHOU | 1.6 s |
| login com senha errada mostra erro e não entra | tablet-ipad | FALHOU | 1.9 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-chrome | FALHOU | 1.7 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-firefox | FALHOU | 4.8 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-safari | FALHOU | 4.1 s |
| login certo, recarregar a página continua logado, e sair funciona | notebook-pequeno | FALHOU | 2.9 s |
| login certo, recarregar a página continua logado, e sair funciona | iphone-se | FALHOU | 4.1 s |
| login certo, recarregar a página continua logado, e sair funciona | iphone-15 | FALHOU | 2.4 s |
| login certo, recarregar a página continua logado, e sair funciona | android-pixel | FALHOU | 2.6 s |
| login certo, recarregar a página continua logado, e sair funciona | android-pequeno | FALHOU | 1.5 s |
| login certo, recarregar a página continua logado, e sair funciona | tablet-ipad | FALHOU | 1.9 s |
| página protegida manda para o login e volta depois | pc-chrome | FALHOU | 70.2 s |
| página protegida manda para o login e volta depois | pc-firefox | FALHOU | 71.2 s |
| página protegida manda para o login e volta depois | pc-safari | FALHOU | 70.2 s |
| página protegida manda para o login e volta depois | notebook-pequeno | FALHOU | 70.3 s |
| página protegida manda para o login e volta depois | iphone-se | FALHOU | 70.3 s |
| página protegida manda para o login e volta depois | iphone-15 | FALHOU | 70.2 s |
| página protegida manda para o login e volta depois | android-pixel | FALHOU | 70.2 s |
| página protegida manda para o login e volta depois | android-pequeno | FALHOU | 70.4 s |
| página protegida manda para o login e volta depois | tablet-ipad | FALHOU | 70.1 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-chrome | ok | 2.5 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-firefox | ok | 4.7 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-safari | ok | 5.0 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | notebook-pequeno | ok | 2.5 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | iphone-se | ok | 1.9 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | iphone-15 | ok | 2.2 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | android-pixel | ok | 2.1 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | android-pequeno | ok | 2.3 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | tablet-ipad | ok | 2.7 s |
| mostrar/ocultar senha funciona | pc-chrome | FALHOU | 1.6 s |
| mostrar/ocultar senha funciona | pc-firefox | FALHOU | 5.2 s |
| mostrar/ocultar senha funciona | pc-safari | FALHOU | 3.4 s |
| mostrar/ocultar senha funciona | notebook-pequeno | FALHOU | 1.9 s |
| mostrar/ocultar senha funciona | iphone-se | FALHOU | 1.4 s |
| mostrar/ocultar senha funciona | iphone-15 | FALHOU | 1.7 s |
| mostrar/ocultar senha funciona | android-pixel | FALHOU | 1.9 s |
| mostrar/ocultar senha funciona | android-pequeno | FALHOU | 1.5 s |
| mostrar/ocultar senha funciona | tablet-ipad | FALHOU | 2.2 s |
| página / abre certinha | pc-chrome | FALHOU | 4.3 s |
| página / abre certinha | pc-firefox | FALHOU | 7.6 s |
| página / abre certinha | pc-safari | FALHOU | 3.5 s |
| página / abre certinha | notebook-pequeno | FALHOU | 5.4 s |
| página / abre certinha | iphone-se | FALHOU | 5.3 s |
| página / abre certinha | iphone-15 | FALHOU | 4.9 s |
| página / abre certinha | android-pixel | FALHOU | 4.8 s |
| página / abre certinha | android-pequeno | FALHOU | 4.6 s |
| página / abre certinha | tablet-ipad | FALHOU | 6.3 s |
| página /eventos abre certinha | pc-chrome | FALHOU | 3.8 s |
| página /eventos abre certinha | pc-firefox | FALHOU | 5.4 s |
| página /eventos abre certinha | pc-safari | FALHOU | 3.5 s |
| página /eventos abre certinha | notebook-pequeno | FALHOU | 4.8 s |
| página /eventos abre certinha | iphone-se | FALHOU | 4.7 s |
| página /eventos abre certinha | iphone-15 | FALHOU | 4.6 s |
| página /eventos abre certinha | android-pixel | FALHOU | 4.7 s |
| página /eventos abre certinha | android-pequeno | FALHOU | 4.6 s |
| página /eventos abre certinha | tablet-ipad | FALHOU | 4.9 s |
| página /entrar abre certinha | pc-chrome | FALHOU | 3.4 s |
| página /entrar abre certinha | pc-firefox | FALHOU | 6.5 s |
| página /entrar abre certinha | pc-safari | FALHOU | 8.2 s |
| página /entrar abre certinha | notebook-pequeno | FALHOU | 3.5 s |
| página /entrar abre certinha | iphone-se | FALHOU | 3.5 s |
| página /entrar abre certinha | iphone-15 | FALHOU | 3.5 s |
| página /entrar abre certinha | android-pixel | FALHOU | 3.7 s |
| página /entrar abre certinha | android-pequeno | FALHOU | 2.9 s |
| página /entrar abre certinha | tablet-ipad | FALHOU | 4.0 s |
| página /cadastro abre certinha | pc-chrome | FALHOU | 4.2 s |
| página /cadastro abre certinha | pc-firefox | FALHOU | 5.9 s |
| página /cadastro abre certinha | pc-safari | FALHOU | 10.3 s |
| página /cadastro abre certinha | notebook-pequeno | FALHOU | 3.7 s |
| página /cadastro abre certinha | iphone-se | FALHOU | 3.8 s |
| página /cadastro abre certinha | iphone-15 | FALHOU | 3.5 s |
| página /cadastro abre certinha | android-pixel | FALHOU | 3.2 s |
| página /cadastro abre certinha | android-pequeno | FALHOU | 3.3 s |
| página /cadastro abre certinha | tablet-ipad | FALHOU | 4.1 s |
| página /esqueci-senha abre certinha | pc-chrome | FALHOU | 4.0 s |
| página /esqueci-senha abre certinha | pc-firefox | FALHOU | 6.5 s |
| página /esqueci-senha abre certinha | pc-safari | FALHOU | 12.5 s |
| página /esqueci-senha abre certinha | notebook-pequeno | FALHOU | 3.5 s |
| página /esqueci-senha abre certinha | iphone-se | FALHOU | 3.9 s |
| página /esqueci-senha abre certinha | iphone-15 | FALHOU | 4.3 s |
| página /esqueci-senha abre certinha | android-pixel | FALHOU | 3.1 s |
| página /esqueci-senha abre certinha | android-pequeno | FALHOU | 3.0 s |
| página /esqueci-senha abre certinha | tablet-ipad | FALHOU | 4.1 s |
| página /termos abre certinha | pc-chrome | FALHOU | 5.2 s |
| página /termos abre certinha | pc-firefox | FALHOU | 7.6 s |
| página /termos abre certinha | pc-safari | FALHOU | 6.6 s |
| página /termos abre certinha | notebook-pequeno | FALHOU | 5.1 s |
| página /termos abre certinha | iphone-se | FALHOU | 6.2 s |
| página /termos abre certinha | iphone-15 | FALHOU | 6.8 s |
| página /termos abre certinha | android-pixel | FALHOU | 5.3 s |
| página /termos abre certinha | android-pequeno | FALHOU | 5.3 s |
| página /termos abre certinha | tablet-ipad | FALHOU | 5.2 s |
| página /privacidade abre certinha | pc-chrome | FALHOU | 4.9 s |
| página /privacidade abre certinha | pc-firefox | FALHOU | 7.1 s |
| página /privacidade abre certinha | pc-safari | FALHOU | 6.4 s |
| página /privacidade abre certinha | notebook-pequeno | FALHOU | 4.4 s |
| página /privacidade abre certinha | iphone-se | FALHOU | 5.2 s |
| página /privacidade abre certinha | iphone-15 | FALHOU | 5.8 s |
| página /privacidade abre certinha | android-pixel | FALHOU | 4.3 s |
| página /privacidade abre certinha | android-pequeno | FALHOU | 4.4 s |
| página /privacidade abre certinha | tablet-ipad | FALHOU | 5.5 s |
| página /termos-organizador abre certinha | pc-chrome | FALHOU | 4.6 s |
| página /termos-organizador abre certinha | pc-firefox | FALHOU | 6.8 s |
| página /termos-organizador abre certinha | pc-safari | FALHOU | 6.4 s |
| página /termos-organizador abre certinha | notebook-pequeno | FALHOU | 4.2 s |
| página /termos-organizador abre certinha | iphone-se | FALHOU | 5.4 s |
| página /termos-organizador abre certinha | iphone-15 | FALHOU | 5.6 s |
| página /termos-organizador abre certinha | android-pixel | FALHOU | 4.8 s |
| página /termos-organizador abre certinha | android-pequeno | FALHOU | 5.4 s |
| página /termos-organizador abre certinha | tablet-ipad | FALHOU | 5.4 s |
| página /app abre certinha | pc-chrome | FALHOU | 4.4 s |
| página /app abre certinha | pc-firefox | ok | 5.7 s |
| página /app abre certinha | pc-safari | FALHOU | 70.1 s |
| página /app abre certinha | notebook-pequeno | FALHOU | 4.0 s |
| página /app abre certinha | iphone-se | FALHOU | 4.3 s |
| página /app abre certinha | iphone-15 | FALHOU | 5.0 s |
| página /app abre certinha | android-pixel | FALHOU | 3.6 s |
| página /app abre certinha | android-pequeno | FALHOU | 3.9 s |
| página /app abre certinha | tablet-ipad | FALHOU | 4.2 s |
| páginas de cada evento de teste | pc-chrome | FALHOU | 20.8 s |
| páginas de cada evento de teste | pc-firefox | FALHOU | 36.6 s |
| páginas de cada evento de teste | pc-safari | FALHOU | 28.1 s |
| páginas de cada evento de teste | notebook-pequeno | FALHOU | 20.6 s |
| páginas de cada evento de teste | iphone-se | FALHOU | 25.0 s |
| páginas de cada evento de teste | iphone-15 | FALHOU | 28.9 s |
| páginas de cada evento de teste | android-pixel | FALHOU | 19.5 s |
| páginas de cada evento de teste | android-pequeno | FALHOU | 20.5 s |
| páginas de cada evento de teste | tablet-ipad | FALHOU | 30.1 s |
| evento privado não aparece na lista nem na busca | pc-chrome | ok | 2.0 s |
| evento privado não aparece na lista nem na busca | pc-firefox | ok | 4.2 s |
| evento privado não aparece na lista nem na busca | pc-safari | ok | 2.2 s |
| evento privado não aparece na lista nem na busca | notebook-pequeno | ok | 1.9 s |
| evento privado não aparece na lista nem na busca | iphone-se | ok | 2.3 s |
| evento privado não aparece na lista nem na busca | iphone-15 | ok | 2.0 s |
| evento privado não aparece na lista nem na busca | android-pixel | ok | 1.6 s |
| evento privado não aparece na lista nem na busca | android-pequeno | ok | 1.9 s |
| evento privado não aparece na lista nem na busca | tablet-ipad | ok | 2.7 s |
| eventos de teste aparecem na lista de eventos | pc-chrome | ok | 1.0 s |
| eventos de teste aparecem na lista de eventos | pc-firefox | ok | 1.9 s |
| eventos de teste aparecem na lista de eventos | pc-safari | ok | 1.4 s |
| eventos de teste aparecem na lista de eventos | notebook-pequeno | ok | 0.9 s |
| eventos de teste aparecem na lista de eventos | iphone-se | ok | 2.0 s |
| eventos de teste aparecem na lista de eventos | iphone-15 | ok | 2.1 s |
| eventos de teste aparecem na lista de eventos | android-pixel | ok | 1.4 s |
| eventos de teste aparecem na lista de eventos | android-pequeno | ok | 1.4 s |
| eventos de teste aparecem na lista de eventos | tablet-ipad | ok | 2.0 s |
| página que não existe mostra aviso amigável (404) | pc-chrome | FALHOU | 0.6 s |
| página que não existe mostra aviso amigável (404) | pc-firefox | ok | 1.0 s |
| página que não existe mostra aviso amigável (404) | pc-safari | ok | 1.3 s |
| página que não existe mostra aviso amigável (404) | notebook-pequeno | FALHOU | 0.7 s |
| página que não existe mostra aviso amigável (404) | iphone-se | ok | 1.1 s |
| página que não existe mostra aviso amigável (404) | iphone-15 | ok | 1.7 s |
| página que não existe mostra aviso amigável (404) | android-pixel | FALHOU | 1.0 s |
| página que não existe mostra aviso amigável (404) | android-pequeno | FALHOU | 1.1 s |
| página que não existe mostra aviso amigável (404) | tablet-ipad | ok | 1.4 s |
| evento inexistente mostra aviso e não quebra | pc-chrome | FALHOU | 1.2 s |
| evento inexistente mostra aviso e não quebra | pc-firefox | ok | 1.1 s |
| evento inexistente mostra aviso e não quebra | pc-safari | ok | 1.1 s |
| evento inexistente mostra aviso e não quebra | notebook-pequeno | FALHOU | 1.0 s |
| evento inexistente mostra aviso e não quebra | iphone-se | ok | 1.0 s |
| evento inexistente mostra aviso e não quebra | iphone-15 | ok | 1.2 s |
| evento inexistente mostra aviso e não quebra | android-pixel | FALHOU | 0.6 s |
| evento inexistente mostra aviso e não quebra | android-pequeno | FALHOU | 0.9 s |
| evento inexistente mostra aviso e não quebra | tablet-ipad | ok | 1.6 s |
| Meus ingressos sem conta pede para entrar | pc-chrome | ok | 5.7 s |
| Meus ingressos sem conta pede para entrar | pc-firefox | FALHOU | 71.0 s |
| Meus ingressos sem conta pede para entrar | pc-safari | ok | 1.3 s |
| Meus ingressos sem conta pede para entrar | notebook-pequeno | ok | 5.7 s |
| Meus ingressos sem conta pede para entrar | iphone-se | ok | 1.3 s |
| Meus ingressos sem conta pede para entrar | iphone-15 | ok | 1.2 s |
| Meus ingressos sem conta pede para entrar | android-pixel | ok | 5.9 s |
| Meus ingressos sem conta pede para entrar | android-pequeno | ok | 5.7 s |
| Meus ingressos sem conta pede para entrar | tablet-ipad | ok | 0.9 s |
| páginas da conta logada | pc-chrome | FALHOU | 9.7 s |
| páginas da conta logada | pc-firefox | FALHOU | 12.0 s |
| páginas da conta logada | pc-safari | FALHOU | 70.3 s |
| páginas da conta logada | notebook-pequeno | FALHOU | 9.0 s |
| páginas da conta logada | iphone-se | FALHOU | 11.7 s |
| páginas da conta logada | iphone-15 | FALHOU | 12.4 s |
| páginas da conta logada | android-pixel | FALHOU | 9.7 s |
| páginas da conta logada | android-pequeno | FALHOU | 9.6 s |
| páginas da conta logada | tablet-ipad | FALHOU | 11.7 s |
| menu e rodapé: todos os links internos abrem | pc-chrome | ok | 2.1 s |
| menu e rodapé: todos os links internos abrem | pc-firefox | ok | 3.9 s |
| menu e rodapé: todos os links internos abrem | pc-safari | ok | 10.7 s |
| menu e rodapé: todos os links internos abrem | notebook-pequeno | ok | 1.8 s |
| menu e rodapé: todos os links internos abrem | iphone-se | ok | 2.7 s |
| menu e rodapé: todos os links internos abrem | iphone-15 | ok | 2.8 s |
| menu e rodapé: todos os links internos abrem | android-pixel | ok | 1.7 s |
| menu e rodapé: todos os links internos abrem | android-pequeno | ok | 2.0 s |
| menu e rodapé: todos os links internos abrem | tablet-ipad | ok | 2.7 s |
| busca com textos estranhos não quebra | pc-chrome | FALHOU | 2.8 s |
| busca com textos estranhos não quebra | pc-firefox | ok | 5.6 s |
| busca com textos estranhos não quebra | pc-safari | ok | 7.5 s |
| busca com textos estranhos não quebra | notebook-pequeno | FALHOU | 2.8 s |
| busca com textos estranhos não quebra | iphone-se | FALHOU | 4.7 s |
| busca com textos estranhos não quebra | iphone-15 | FALHOU | 5.5 s |
| busca com textos estranhos não quebra | android-pixel | FALHOU | 2.7 s |
| busca com textos estranhos não quebra | android-pequeno | FALHOU | 2.5 s |
| busca com textos estranhos não quebra | tablet-ipad | ok | 4.8 s |
| buscar pelo campo da página inicial | pc-chrome | ok | 1.3 s |
| buscar pelo campo da página inicial | pc-firefox | ok | 1.8 s |
| buscar pelo campo da página inicial | pc-safari | ok | 7.3 s |
| buscar pelo campo da página inicial | notebook-pequeno | ok | 1.2 s |
| buscar pelo campo da página inicial | iphone-se | ok | 2.8 s |
| buscar pelo campo da página inicial | iphone-15 | ok | 4.1 s |
| buscar pelo campo da página inicial | android-pixel | ok | 1.3 s |
| buscar pelo campo da página inicial | android-pequeno | ok | 1.8 s |
| buscar pelo campo da página inicial | tablet-ipad | ok | 3.0 s |
| filtro por categoria leva para a lista filtrada | pc-chrome | ok | 1.6 s |
| filtro por categoria leva para a lista filtrada | pc-firefox | ok | 1.9 s |
| filtro por categoria leva para a lista filtrada | pc-safari | ok | 4.3 s |
| filtro por categoria leva para a lista filtrada | notebook-pequeno | ok | 1.5 s |
| filtro por categoria leva para a lista filtrada | iphone-se | ok | 3.6 s |
| filtro por categoria leva para a lista filtrada | iphone-15 | ok | 4.8 s |
| filtro por categoria leva para a lista filtrada | android-pixel | ok | 1.8 s |
| filtro por categoria leva para a lista filtrada | android-pequeno | ok | 1.9 s |
| filtro por categoria leva para a lista filtrada | tablet-ipad | ok | 3.4 s |
