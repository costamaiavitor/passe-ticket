# Resultado da caça a bugs

513 execuções (testes × aparelhos): **465 ok**, **38 com problema**, 10 puladas.

## Problemas por teste

### app-e-rede.spec.ts › sem internet na porta: o ingresso abre com o QR Code
Aparelhos: pc-safari

- Error: expect(locator).toHaveCount(expected) failed ⏎ Locator:  locator('article') ⏎ Expected: 1 ⏎ Received: 0 ⏎ Timeout:  10000ms ⏎ Call log:

### app-e-rede.spec.ts › voltar e avançar no navegador não quebra a compra
Aparelhos: pc-safari, iphone-se, iphone-15

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 4 ⏎ - Array [] ⏎ + Array [

### app-e-rede.spec.ts › manifesto do app e ícones existem (para instalar pelo navegador)
Aparelhos: pc-chrome

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › sem conta: 'Entrar para comprar' leva ao login e volta para o evento
Aparelhos: android-pequeno

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### compra.spec.ts › evento privado: senha errada não libera, senha certa libera os ingressos
Aparelhos: pc-safari, iphone-se, iphone-15, tablet-ipad

- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/palavra-senha incorreta/i).first() ⏎ Expected: visible ⏎ Timeout: 10000ms ⏎ Error: element(s) not found ⏎ Call log:

### compra.spec.ts › clique duplo em 'Ir para pagamento' não cria dois pedidos
Aparelhos: pc-safari

- Error: pedidos criados com o clique duplo ⏎ expect(received).toBe(expected) // Object.is equality ⏎ Expected: 1 ⏎ Received: 2 ⏎   183 |   const orders = await api<any[]>("/orders", { token: me.token }); ⏎   184 |   const pending = (orders.body ?? []).filter((o: any) => o.status === "pending");
- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### conta.spec.ts › login certo, recarregar a página continua logado, e sair funciona
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Test timeout of 60000ms exceeded.
- Error: page.goto: net::ERR_ABORTED; maybe frame was detached? ⏎ Call log: ⏎   - navigating to "http://localhost:8080/ingressos", waiting until "load" ⏎   93 |   } ⏎   94 |   await sair.first().click(); ⏎ > 95 |   await page.goto("/ingressos");
- Error: page.goto: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - navigating to "http://localhost:8080/ingressos", waiting until "load" ⏎   93 |   } ⏎   94 |   await sair.first().click(); ⏎ > 95 |   await page.goto("/ingressos");
- Error: page.goto: Target page, context or browser has been closed ⏎   93 |   } ⏎   94 |   await sair.first().click(); ⏎ > 95 |   await page.goto("/ingressos"); ⏎      |              ^ ⏎   96 |   await expect(page.getByText(/entrar|faça login/i).first()).toBeVisible();
- Error: page.goto: net::ERR_ABORTED at http://localhost:8080/ingressos ⏎ Call log: ⏎   - navigating to "http://localhost:8080/ingressos", waiting until "load" ⏎   93 |   } ⏎   94 |   await sair.first().click(); ⏎ > 95 |   await page.goto("/ingressos");

### conta.spec.ts › página protegida manda para o login e volta depois
Aparelhos: pc-chrome, pc-firefox, pc-safari, notebook-pequeno, iphone-se, iphone-15, android-pixel, android-pequeno, tablet-ipad

- Test timeout of 60000ms exceeded.
- Error: locator.click: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - waiting for locator('main').getByRole('link', { name: /entrar/i }).first() ⏎   100 |   const b = await newBuyer(); ⏎   101 |   await page.goto("/ingressos"); ⏎ > 102 |   await page.locator("main").getByRole("link", { name: /entrar/i }).first().click();

### paginas.spec.ts › página /entrar abre certinha
Aparelhos: iphone-se, iphone-15, android-pixel, android-pequeno

- Error: [/entrar] Botões pequenos demais para o dedo (menos de 24px) ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

### paginas.spec.ts › Meus ingressos sem conta pede para entrar
Aparelhos: pc-firefox

- Test timeout of 60000ms exceeded.
- Error: expect(locator).toBeVisible() failed ⏎ Locator: getByText(/entrar|faça login/i).first() ⏎ Expected: visible ⏎ Error: Test timeout of 60000ms exceeded. ⏎ Call log: ⏎   - Expect "toBeVisible" getByText(/entrar|faça login/i).first() with timeout 10000ms

### paginas.spec.ts › busca com textos estranhos não quebra
Aparelhos: pc-safari, iphone-se, iphone-15, tablet-ipad

- Error: Erros no console do navegador ⏎ expect(received).toEqual(expected) // deep equality ⏎ - Expected  - 1 ⏎ + Received  + 3 ⏎ - Array [] ⏎ + Array [

## Medições

- sem internet na porta: o ingresso abre com o QR Code (pc-firefox): skip: o Firefox do Playwright não simula sem-internet com service worker
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-chrome): tempo-3g: 29 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-firefox): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (pc-safari): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (notebook-pequeno): tempo-3g: 29 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (iphone-se): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (iphone-15): skip: simulação de 3G só existe no Chrome
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (android-pixel): tempo-3g: 28 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (android-pequeno): tempo-3g: 28 s até poder escolher ingresso
- internet lenta (3G): a página do evento abre e dá para escolher ingresso (tablet-ipad): skip: simulação de 3G só existe no Chrome
- página /app: botão de instalar ou passo a passo aparece no celular (pc-chrome): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (pc-firefox): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (pc-safari): skip: só no celular
- página /app: botão de instalar ou passo a passo aparece no celular (notebook-pequeno): skip: só no celular

## Todas as execuções

| Teste | Aparelho | Resultado | Tempo |
|---|---|---|---|
| sem internet na porta: o ingresso abre com o QR Code | pc-chrome | ok | 2.6 s |
| sem internet na porta: o ingresso abre com o QR Code | pc-firefox | pulado | 2.4 s |
| sem internet na porta: o ingresso abre com o QR Code | pc-safari | FALHOU | 23.1 s |
| sem internet na porta: o ingresso abre com o QR Code | notebook-pequeno | ok | 4.8 s |
| sem internet na porta: o ingresso abre com o QR Code | iphone-se | ok | 3.5 s |
| sem internet na porta: o ingresso abre com o QR Code | iphone-15 | ok | 4.1 s |
| sem internet na porta: o ingresso abre com o QR Code | android-pixel | ok | 2.4 s |
| sem internet na porta: o ingresso abre com o QR Code | android-pequeno | ok | 3.3 s |
| sem internet na porta: o ingresso abre com o QR Code | tablet-ipad | ok | 5.4 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-chrome | ok | 29.4 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-firefox | pulado | 3.1 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | pc-safari | pulado | 0.7 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | notebook-pequeno | ok | 29.2 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | iphone-se | pulado | 0.6 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | iphone-15 | pulado | 0.8 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | android-pixel | ok | 29.3 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | android-pequeno | ok | 29.0 s |
| internet lenta (3G): a página do evento abre e dá para escolher ingresso | tablet-ipad | pulado | 0.9 s |
| voltar e avançar no navegador não quebra a compra | pc-chrome | ok | 3.8 s |
| voltar e avançar no navegador não quebra a compra | pc-firefox | ok | 6.5 s |
| voltar e avançar no navegador não quebra a compra | pc-safari | FALHOU | 7.4 s |
| voltar e avançar no navegador não quebra a compra | notebook-pequeno | ok | 5.9 s |
| voltar e avançar no navegador não quebra a compra | iphone-se | FALHOU | 6.4 s |
| voltar e avançar no navegador não quebra a compra | iphone-15 | FALHOU | 7.0 s |
| voltar e avançar no navegador não quebra a compra | android-pixel | ok | 3.7 s |
| voltar e avançar no navegador não quebra a compra | android-pequeno | ok | 3.9 s |
| voltar e avançar no navegador não quebra a compra | tablet-ipad | ok | 4.8 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-chrome | FALHOU | 2.1 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-firefox | ok | 2.8 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | pc-safari | ok | 2.2 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | notebook-pequeno | ok | 2.9 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | iphone-se | ok | 1.7 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | iphone-15 | ok | 2.0 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | android-pixel | ok | 0.8 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | android-pequeno | ok | 0.9 s |
| manifesto do app e ícones existem (para instalar pelo navegador) | tablet-ipad | ok | 2.4 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-chrome | pulado | 0.3 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-firefox | pulado | 0.7 s |
| página /app: botão de instalar ou passo a passo aparece no celular | pc-safari | pulado | 0.8 s |
| página /app: botão de instalar ou passo a passo aparece no celular | notebook-pequeno | pulado | 0.2 s |
| página /app: botão de instalar ou passo a passo aparece no celular | iphone-se | ok | 2.2 s |
| página /app: botão de instalar ou passo a passo aparece no celular | iphone-15 | ok | 1.5 s |
| página /app: botão de instalar ou passo a passo aparece no celular | android-pixel | ok | 0.8 s |
| página /app: botão de instalar ou passo a passo aparece no celular | android-pequeno | ok | 0.7 s |
| página /app: botão de instalar ou passo a passo aparece no celular | tablet-ipad | ok | 2.0 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-chrome | ok | 0.3 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-firefox | ok | 0.7 s |
| compartilhar link do evento: a prévia tem título e imagem | pc-safari | ok | 0.7 s |
| compartilhar link do evento: a prévia tem título e imagem | notebook-pequeno | ok | 0.4 s |
| compartilhar link do evento: a prévia tem título e imagem | iphone-se | ok | 0.6 s |
| compartilhar link do evento: a prévia tem título e imagem | iphone-15 | ok | 0.9 s |
| compartilhar link do evento: a prévia tem título e imagem | android-pixel | ok | 0.4 s |
| compartilhar link do evento: a prévia tem título e imagem | android-pequeno | ok | 0.3 s |
| compartilhar link do evento: a prévia tem título e imagem | tablet-ipad | ok | 0.9 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-chrome | ok | 9.3 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-firefox | ok | 13.2 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | pc-safari | ok | 17.3 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | notebook-pequeno | ok | 9.4 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | iphone-se | ok | 11.8 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | iphone-15 | ok | 16.2 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | android-pixel | ok | 12.9 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | android-pequeno | ok | 8.2 s |
| compra completa: 2 ingressos de Pista, paga no Pix e os QR Codes aparecem | tablet-ipad | ok | 15.3 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-chrome | ok | 3.4 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-firefox | ok | 4.6 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | pc-safari | ok | 5.6 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | notebook-pequeno | ok | 3.1 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | iphone-se | ok | 4.6 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | iphone-15 | ok | 6.2 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | android-pixel | ok | 2.2 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | android-pequeno | ok | 3.0 s |
| misturar Pista, Meia e Camarote na mesma compra soma certo | tablet-ipad | ok | 6.0 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-chrome | ok | 4.0 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-firefox | ok | 4.9 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | pc-safari | ok | 25.8 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | notebook-pequeno | ok | 3.7 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | iphone-se | ok | 5.0 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | iphone-15 | ok | 7.0 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | android-pixel | ok | 4.4 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | android-pequeno | FALHOU | 2.9 s |
| sem conta: 'Entrar para comprar' leva ao login e volta para o evento | tablet-ipad | ok | 5.3 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-chrome | ok | 2.5 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-firefox | ok | 4.2 s |
| titular com CPF inválido: mostra erro e não cria pedido | pc-safari | ok | 6.2 s |
| titular com CPF inválido: mostra erro e não cria pedido | notebook-pequeno | ok | 2.8 s |
| titular com CPF inválido: mostra erro e não cria pedido | iphone-se | ok | 3.8 s |
| titular com CPF inválido: mostra erro e não cria pedido | iphone-15 | ok | 6.1 s |
| titular com CPF inválido: mostra erro e não cria pedido | android-pixel | ok | 4.3 s |
| titular com CPF inválido: mostra erro e não cria pedido | android-pequeno | ok | 3.2 s |
| titular com CPF inválido: mostra erro e não cria pedido | tablet-ipad | ok | 6.2 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-chrome | ok | 3.7 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-firefox | ok | 5.2 s |
| sem marcar o aceite dos Termos não vai para o pagamento | pc-safari | ok | 7.9 s |
| sem marcar o aceite dos Termos não vai para o pagamento | notebook-pequeno | ok | 3.3 s |
| sem marcar o aceite dos Termos não vai para o pagamento | iphone-se | ok | 5.3 s |
| sem marcar o aceite dos Termos não vai para o pagamento | iphone-15 | ok | 10.0 s |
| sem marcar o aceite dos Termos não vai para o pagamento | android-pixel | ok | 9.8 s |
| sem marcar o aceite dos Termos não vai para o pagamento | android-pequeno | ok | 4.2 s |
| sem marcar o aceite dos Termos não vai para o pagamento | tablet-ipad | ok | 7.0 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-chrome | ok | 4.9 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-firefox | ok | 6.6 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | pc-safari | ok | 9.1 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | notebook-pequeno | ok | 3.9 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | iphone-se | ok | 6.8 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | iphone-15 | ok | 12.1 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | android-pixel | ok | 9.4 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | android-pequeno | ok | 4.4 s |
| mesmo CPF em dois ingressos do mesmo pedido acima do limite é barrado com aviso | tablet-ipad | ok | 10.7 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-chrome | ok | 2.8 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-firefox | ok | 8.6 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | pc-safari | ok | 8.0 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | notebook-pequeno | ok | 2.4 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | iphone-se | ok | 4.6 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | iphone-15 | ok | 7.8 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | android-pixel | ok | 12.3 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | android-pequeno | ok | 3.7 s |
| cupom QA10 dá 10% de desconto e cupom errado mostra erro | tablet-ipad | ok | 9.9 s |
| evento esgotado não deixa comprar e avisa | pc-chrome | ok | 1.7 s |
| evento esgotado não deixa comprar e avisa | pc-firefox | ok | 3.5 s |
| evento esgotado não deixa comprar e avisa | pc-safari | ok | 2.7 s |
| evento esgotado não deixa comprar e avisa | notebook-pequeno | ok | 1.6 s |
| evento esgotado não deixa comprar e avisa | iphone-se | ok | 1.6 s |
| evento esgotado não deixa comprar e avisa | iphone-15 | ok | 2.8 s |
| evento esgotado não deixa comprar e avisa | android-pixel | ok | 9.2 s |
| evento esgotado não deixa comprar e avisa | android-pequeno | ok | 3.9 s |
| evento esgotado não deixa comprar e avisa | tablet-ipad | ok | 4.6 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-chrome | ok | 2.2 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-firefox | ok | 5.0 s |
| últimos ingressos: não deixa escolher mais do que tem | pc-safari | ok | 3.6 s |
| últimos ingressos: não deixa escolher mais do que tem | notebook-pequeno | ok | 2.5 s |
| últimos ingressos: não deixa escolher mais do que tem | iphone-se | ok | 2.5 s |
| últimos ingressos: não deixa escolher mais do que tem | iphone-15 | ok | 4.8 s |
| últimos ingressos: não deixa escolher mais do que tem | android-pixel | ok | 4.5 s |
| últimos ingressos: não deixa escolher mais do que tem | android-pequeno | ok | 3.9 s |
| últimos ingressos: não deixa escolher mais do que tem | tablet-ipad | ok | 4.8 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-chrome | ok | 2.3 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-firefox | ok | 5.0 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | pc-safari | FALHOU | 14.9 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | notebook-pequeno | ok | 2.5 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | iphone-se | FALHOU | 13.9 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | iphone-15 | FALHOU | 15.0 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | android-pixel | ok | 2.7 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | android-pequeno | ok | 4.2 s |
| evento privado: senha errada não libera, senha certa libera os ingressos | tablet-ipad | FALHOU | 14.2 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-chrome | ok | 3.5 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-firefox | ok | 10.0 s |
| evento grátis: dá para pegar ingresso sem pagar | pc-safari | ok | 10.5 s |
| evento grátis: dá para pegar ingresso sem pagar | notebook-pequeno | ok | 3.0 s |
| evento grátis: dá para pegar ingresso sem pagar | iphone-se | ok | 5.3 s |
| evento grátis: dá para pegar ingresso sem pagar | iphone-15 | ok | 6.5 s |
| evento grátis: dá para pegar ingresso sem pagar | android-pixel | ok | 7.2 s |
| evento grátis: dá para pegar ingresso sem pagar | android-pequeno | ok | 4.9 s |
| evento grátis: dá para pegar ingresso sem pagar | tablet-ipad | ok | 9.3 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-chrome | ok | 2.9 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-firefox | ok | 6.2 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | pc-safari | FALHOU | 8.3 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | notebook-pequeno | ok | 3.0 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | iphone-se | ok | 5.2 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | iphone-15 | ok | 5.4 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | android-pixel | ok | 6.8 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | android-pequeno | ok | 4.6 s |
| clique duplo em 'Ir para pagamento' não cria dois pedidos | tablet-ipad | ok | 7.6 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-chrome | ok | 3.5 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-firefox | ok | 7.3 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | pc-safari | ok | 9.5 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | notebook-pequeno | ok | 4.1 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | iphone-se | ok | 5.3 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | iphone-15 | ok | 9.4 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | android-pixel | ok | 3.7 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | android-pequeno | ok | 5.3 s |
| voltar do pagamento e cancelar o pedido devolve os ingressos | tablet-ipad | ok | 7.8 s |
| recarregar a página do pagamento não perde o pedido | pc-chrome | ok | 3.4 s |
| recarregar a página do pagamento não perde o pedido | pc-firefox | ok | 7.1 s |
| recarregar a página do pagamento não perde o pedido | pc-safari | ok | 8.8 s |
| recarregar a página do pagamento não perde o pedido | notebook-pequeno | ok | 2.7 s |
| recarregar a página do pagamento não perde o pedido | iphone-se | ok | 4.8 s |
| recarregar a página do pagamento não perde o pedido | iphone-15 | ok | 8.2 s |
| recarregar a página do pagamento não perde o pedido | android-pixel | ok | 6.6 s |
| recarregar a página do pagamento não perde o pedido | android-pequeno | ok | 4.0 s |
| recarregar a página do pagamento não perde o pedido | tablet-ipad | ok | 7.7 s |
| pedido de outra pessoa não abre | pc-chrome | ok | 1.2 s |
| pedido de outra pessoa não abre | pc-firefox | ok | 5.2 s |
| pedido de outra pessoa não abre | pc-safari | ok | 2.8 s |
| pedido de outra pessoa não abre | notebook-pequeno | ok | 1.0 s |
| pedido de outra pessoa não abre | iphone-se | ok | 1.8 s |
| pedido de outra pessoa não abre | iphone-15 | ok | 4.5 s |
| pedido de outra pessoa não abre | android-pixel | ok | 4.2 s |
| pedido de outra pessoa não abre | android-pequeno | ok | 2.1 s |
| pedido de outra pessoa não abre | tablet-ipad | ok | 2.0 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-chrome | ok | 1.9 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-firefox | ok | 3.0 s |
| devolver a compra em Meus ingressos cancela os ingressos | pc-safari | ok | 4.5 s |
| devolver a compra em Meus ingressos cancela os ingressos | notebook-pequeno | ok | 1.3 s |
| devolver a compra em Meus ingressos cancela os ingressos | iphone-se | ok | 2.6 s |
| devolver a compra em Meus ingressos cancela os ingressos | iphone-15 | ok | 6.1 s |
| devolver a compra em Meus ingressos cancela os ingressos | android-pixel | ok | 2.7 s |
| devolver a compra em Meus ingressos cancela os ingressos | android-pequeno | ok | 2.3 s |
| devolver a compra em Meus ingressos cancela os ingressos | tablet-ipad | ok | 4.2 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-chrome | ok | 4.7 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-firefox | ok | 7.0 s |
| transferir ingresso: a outra pessoa recebe e aceita | pc-safari | ok | 11.2 s |
| transferir ingresso: a outra pessoa recebe e aceita | notebook-pequeno | ok | 3.9 s |
| transferir ingresso: a outra pessoa recebe e aceita | iphone-se | ok | 6.4 s |
| transferir ingresso: a outra pessoa recebe e aceita | iphone-15 | ok | 10.3 s |
| transferir ingresso: a outra pessoa recebe e aceita | android-pixel | ok | 6.9 s |
| transferir ingresso: a outra pessoa recebe e aceita | android-pequeno | ok | 5.0 s |
| transferir ingresso: a outra pessoa recebe e aceita | tablet-ipad | ok | 8.7 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-chrome | ok | 5.3 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-firefox | ok | 6.4 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | pc-safari | ok | 7.6 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | notebook-pequeno | ok | 3.9 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | iphone-se | ok | 5.7 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | iphone-15 | ok | 7.8 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | android-pixel | ok | 6.3 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | android-pequeno | ok | 4.9 s |
| nomes com acento, emoji e muito compridos aparecem direito no ingresso | tablet-ipad | ok | 7.9 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-chrome | ok | 2.4 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-firefox | ok | 3.1 s |
| nome de titular com código malicioso não roda no navegador (XSS) | pc-safari | ok | 4.0 s |
| nome de titular com código malicioso não roda no navegador (XSS) | notebook-pequeno | ok | 1.5 s |
| nome de titular com código malicioso não roda no navegador (XSS) | iphone-se | ok | 2.1 s |
| nome de titular com código malicioso não roda no navegador (XSS) | iphone-15 | ok | 4.0 s |
| nome de titular com código malicioso não roda no navegador (XSS) | android-pixel | ok | 2.6 s |
| nome de titular com código malicioso não roda no navegador (XSS) | android-pequeno | ok | 2.1 s |
| nome de titular com código malicioso não roda no navegador (XSS) | tablet-ipad | ok | 4.0 s |
| cadastro novo pela tela entra direto na conta | pc-chrome | ok | 1.7 s |
| cadastro novo pela tela entra direto na conta | pc-firefox | ok | 4.8 s |
| cadastro novo pela tela entra direto na conta | pc-safari | ok | 8.9 s |
| cadastro novo pela tela entra direto na conta | notebook-pequeno | ok | 2.7 s |
| cadastro novo pela tela entra direto na conta | iphone-se | ok | 4.0 s |
| cadastro novo pela tela entra direto na conta | iphone-15 | ok | 3.6 s |
| cadastro novo pela tela entra direto na conta | android-pixel | ok | 3.1 s |
| cadastro novo pela tela entra direto na conta | android-pequeno | ok | 2.4 s |
| cadastro novo pela tela entra direto na conta | tablet-ipad | ok | 4.6 s |
| cadastro com CPF digitado sem pontos também funciona | pc-chrome | ok | 1.8 s |
| cadastro com CPF digitado sem pontos também funciona | pc-firefox | ok | 3.3 s |
| cadastro com CPF digitado sem pontos também funciona | pc-safari | ok | 12.0 s |
| cadastro com CPF digitado sem pontos também funciona | notebook-pequeno | ok | 1.9 s |
| cadastro com CPF digitado sem pontos também funciona | iphone-se | ok | 3.8 s |
| cadastro com CPF digitado sem pontos também funciona | iphone-15 | ok | 5.2 s |
| cadastro com CPF digitado sem pontos também funciona | android-pixel | ok | 3.7 s |
| cadastro com CPF digitado sem pontos também funciona | android-pequeno | ok | 2.9 s |
| cadastro com CPF digitado sem pontos também funciona | tablet-ipad | ok | 6.5 s |
| cadastro com CPF inválido mostra erro claro | pc-chrome | ok | 1.8 s |
| cadastro com CPF inválido mostra erro claro | pc-firefox | ok | 3.2 s |
| cadastro com CPF inválido mostra erro claro | pc-safari | ok | 14.6 s |
| cadastro com CPF inválido mostra erro claro | notebook-pequeno | ok | 1.6 s |
| cadastro com CPF inválido mostra erro claro | iphone-se | ok | 2.7 s |
| cadastro com CPF inválido mostra erro claro | iphone-15 | ok | 2.5 s |
| cadastro com CPF inválido mostra erro claro | android-pixel | ok | 1.9 s |
| cadastro com CPF inválido mostra erro claro | android-pequeno | ok | 2.0 s |
| cadastro com CPF inválido mostra erro claro | tablet-ipad | ok | 2.7 s |
| cadastro com e-mail já usado avisa | pc-chrome | ok | 1.4 s |
| cadastro com e-mail já usado avisa | pc-firefox | ok | 2.8 s |
| cadastro com e-mail já usado avisa | pc-safari | ok | 13.8 s |
| cadastro com e-mail já usado avisa | notebook-pequeno | ok | 1.7 s |
| cadastro com e-mail já usado avisa | iphone-se | ok | 2.3 s |
| cadastro com e-mail já usado avisa | iphone-15 | ok | 2.9 s |
| cadastro com e-mail já usado avisa | android-pixel | ok | 2.1 s |
| cadastro com e-mail já usado avisa | android-pequeno | ok | 2.3 s |
| cadastro com e-mail já usado avisa | tablet-ipad | ok | 3.0 s |
| cadastro com CPF já usado avisa | pc-chrome | ok | 1.9 s |
| cadastro com CPF já usado avisa | pc-firefox | ok | 3.7 s |
| cadastro com CPF já usado avisa | pc-safari | ok | 12.8 s |
| cadastro com CPF já usado avisa | notebook-pequeno | ok | 1.7 s |
| cadastro com CPF já usado avisa | iphone-se | ok | 2.4 s |
| cadastro com CPF já usado avisa | iphone-15 | ok | 3.1 s |
| cadastro com CPF já usado avisa | android-pixel | ok | 2.3 s |
| cadastro com CPF já usado avisa | android-pequeno | ok | 1.7 s |
| cadastro com CPF já usado avisa | tablet-ipad | ok | 3.2 s |
| cadastro com senha curta não passa | pc-chrome | ok | 2.0 s |
| cadastro com senha curta não passa | pc-firefox | ok | 3.8 s |
| cadastro com senha curta não passa | pc-safari | ok | 15.8 s |
| cadastro com senha curta não passa | notebook-pequeno | ok | 1.8 s |
| cadastro com senha curta não passa | iphone-se | ok | 2.9 s |
| cadastro com senha curta não passa | iphone-15 | ok | 2.8 s |
| cadastro com senha curta não passa | android-pixel | ok | 1.9 s |
| cadastro com senha curta não passa | android-pequeno | ok | 2.0 s |
| cadastro com senha curta não passa | tablet-ipad | ok | 2.9 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-chrome | ok | 4.5 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-firefox | ok | 5.9 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | pc-safari | ok | 21.3 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | notebook-pequeno | ok | 3.9 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | iphone-se | ok | 6.3 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | iphone-15 | ok | 6.8 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | android-pixel | ok | 4.5 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | android-pequeno | ok | 4.2 s |
| cadastro com e-mail em maiúsculas e espaços entra com o e-mail normal depois | tablet-ipad | ok | 11.2 s |
| login com senha errada mostra erro e não entra | pc-chrome | ok | 2.5 s |
| login com senha errada mostra erro e não entra | pc-firefox | ok | 3.6 s |
| login com senha errada mostra erro e não entra | pc-safari | ok | 14.3 s |
| login com senha errada mostra erro e não entra | notebook-pequeno | ok | 2.3 s |
| login com senha errada mostra erro e não entra | iphone-se | ok | 2.3 s |
| login com senha errada mostra erro e não entra | iphone-15 | ok | 3.1 s |
| login com senha errada mostra erro e não entra | android-pixel | ok | 2.5 s |
| login com senha errada mostra erro e não entra | android-pequeno | ok | 2.4 s |
| login com senha errada mostra erro e não entra | tablet-ipad | ok | 3.3 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-chrome | FALHOU | 72.5 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-firefox | FALHOU | 79.7 s |
| login certo, recarregar a página continua logado, e sair funciona | pc-safari | FALHOU | 81.2 s |
| login certo, recarregar a página continua logado, e sair funciona | notebook-pequeno | FALHOU | 72.5 s |
| login certo, recarregar a página continua logado, e sair funciona | iphone-se | FALHOU | 73.4 s |
| login certo, recarregar a página continua logado, e sair funciona | iphone-15 | FALHOU | 83.8 s |
| login certo, recarregar a página continua logado, e sair funciona | android-pixel | FALHOU | 78.4 s |
| login certo, recarregar a página continua logado, e sair funciona | android-pequeno | FALHOU | 78.5 s |
| login certo, recarregar a página continua logado, e sair funciona | tablet-ipad | FALHOU | 73.5 s |
| página protegida manda para o login e volta depois | pc-chrome | FALHOU | 78.2 s |
| página protegida manda para o login e volta depois | pc-firefox | FALHOU | 79.0 s |
| página protegida manda para o login e volta depois | pc-safari | FALHOU | 82.3 s |
| página protegida manda para o login e volta depois | notebook-pequeno | FALHOU | 78.3 s |
| página protegida manda para o login e volta depois | iphone-se | FALHOU | 81.0 s |
| página protegida manda para o login e volta depois | iphone-15 | FALHOU | 82.7 s |
| página protegida manda para o login e volta depois | android-pixel | FALHOU | 78.2 s |
| página protegida manda para o login e volta depois | android-pequeno | FALHOU | 78.3 s |
| página protegida manda para o login e volta depois | tablet-ipad | FALHOU | 80.6 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-chrome | ok | 2.2 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-firefox | ok | 3.3 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | pc-safari | ok | 11.5 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | notebook-pequeno | ok | 1.7 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | iphone-se | ok | 2.1 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | iphone-15 | ok | 2.9 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | android-pixel | ok | 0.8 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | android-pequeno | ok | 2.0 s |
| esqueci a senha responde ok sem revelar se o e-mail existe | tablet-ipad | ok | 2.6 s |
| mostrar/ocultar senha funciona | pc-chrome | ok | 2.1 s |
| mostrar/ocultar senha funciona | pc-firefox | ok | 2.7 s |
| mostrar/ocultar senha funciona | pc-safari | ok | 10.4 s |
| mostrar/ocultar senha funciona | notebook-pequeno | ok | 2.0 s |
| mostrar/ocultar senha funciona | iphone-se | ok | 2.2 s |
| mostrar/ocultar senha funciona | iphone-15 | ok | 2.3 s |
| mostrar/ocultar senha funciona | android-pixel | ok | 1.9 s |
| mostrar/ocultar senha funciona | android-pequeno | ok | 1.8 s |
| mostrar/ocultar senha funciona | tablet-ipad | ok | 2.5 s |
| página / abre certinha | pc-chrome | ok | 3.4 s |
| página / abre certinha | pc-firefox | ok | 5.3 s |
| página / abre certinha | pc-safari | ok | 5.0 s |
| página / abre certinha | notebook-pequeno | ok | 3.6 s |
| página / abre certinha | iphone-se | ok | 4.9 s |
| página / abre certinha | iphone-15 | ok | 5.4 s |
| página / abre certinha | android-pixel | ok | 3.8 s |
| página / abre certinha | android-pequeno | ok | 3.8 s |
| página / abre certinha | tablet-ipad | ok | 5.2 s |
| página /eventos abre certinha | pc-chrome | ok | 3.7 s |
| página /eventos abre certinha | pc-firefox | ok | 4.9 s |
| página /eventos abre certinha | pc-safari | ok | 5.0 s |
| página /eventos abre certinha | notebook-pequeno | ok | 3.5 s |
| página /eventos abre certinha | iphone-se | ok | 5.2 s |
| página /eventos abre certinha | iphone-15 | ok | 5.1 s |
| página /eventos abre certinha | android-pixel | ok | 3.9 s |
| página /eventos abre certinha | android-pequeno | ok | 3.9 s |
| página /eventos abre certinha | tablet-ipad | ok | 5.0 s |
| página /entrar abre certinha | pc-chrome | ok | 2.9 s |
| página /entrar abre certinha | pc-firefox | ok | 4.1 s |
| página /entrar abre certinha | pc-safari | ok | 13.7 s |
| página /entrar abre certinha | notebook-pequeno | ok | 2.8 s |
| página /entrar abre certinha | iphone-se | FALHOU | 3.8 s |
| página /entrar abre certinha | iphone-15 | FALHOU | 4.0 s |
| página /entrar abre certinha | android-pixel | FALHOU | 2.9 s |
| página /entrar abre certinha | android-pequeno | FALHOU | 3.0 s |
| página /entrar abre certinha | tablet-ipad | ok | 3.7 s |
| página /cadastro abre certinha | pc-chrome | ok | 3.5 s |
| página /cadastro abre certinha | pc-firefox | ok | 4.2 s |
| página /cadastro abre certinha | pc-safari | ok | 11.9 s |
| página /cadastro abre certinha | notebook-pequeno | ok | 2.8 s |
| página /cadastro abre certinha | iphone-se | ok | 3.1 s |
| página /cadastro abre certinha | iphone-15 | ok | 3.1 s |
| página /cadastro abre certinha | android-pixel | ok | 2.6 s |
| página /cadastro abre certinha | android-pequeno | ok | 2.8 s |
| página /cadastro abre certinha | tablet-ipad | ok | 4.1 s |
| página /esqueci-senha abre certinha | pc-chrome | ok | 3.4 s |
| página /esqueci-senha abre certinha | pc-firefox | ok | 5.2 s |
| página /esqueci-senha abre certinha | pc-safari | ok | 11.7 s |
| página /esqueci-senha abre certinha | notebook-pequeno | ok | 2.9 s |
| página /esqueci-senha abre certinha | iphone-se | ok | 3.6 s |
| página /esqueci-senha abre certinha | iphone-15 | ok | 4.3 s |
| página /esqueci-senha abre certinha | android-pixel | ok | 3.3 s |
| página /esqueci-senha abre certinha | android-pequeno | ok | 3.1 s |
| página /esqueci-senha abre certinha | tablet-ipad | ok | 4.1 s |
| página /termos abre certinha | pc-chrome | ok | 4.3 s |
| página /termos abre certinha | pc-firefox | ok | 5.0 s |
| página /termos abre certinha | pc-safari | ok | 6.4 s |
| página /termos abre certinha | notebook-pequeno | ok | 4.0 s |
| página /termos abre certinha | iphone-se | ok | 5.4 s |
| página /termos abre certinha | iphone-15 | ok | 5.8 s |
| página /termos abre certinha | android-pixel | ok | 4.2 s |
| página /termos abre certinha | android-pequeno | ok | 4.6 s |
| página /termos abre certinha | tablet-ipad | ok | 5.3 s |
| página /privacidade abre certinha | pc-chrome | ok | 4.0 s |
| página /privacidade abre certinha | pc-firefox | ok | 4.5 s |
| página /privacidade abre certinha | pc-safari | ok | 5.1 s |
| página /privacidade abre certinha | notebook-pequeno | ok | 3.6 s |
| página /privacidade abre certinha | iphone-se | ok | 4.8 s |
| página /privacidade abre certinha | iphone-15 | ok | 5.5 s |
| página /privacidade abre certinha | android-pixel | ok | 3.8 s |
| página /privacidade abre certinha | android-pequeno | ok | 3.8 s |
| página /privacidade abre certinha | tablet-ipad | ok | 5.2 s |
| página /termos-organizador abre certinha | pc-chrome | ok | 3.9 s |
| página /termos-organizador abre certinha | pc-firefox | ok | 4.4 s |
| página /termos-organizador abre certinha | pc-safari | ok | 4.6 s |
| página /termos-organizador abre certinha | notebook-pequeno | ok | 3.4 s |
| página /termos-organizador abre certinha | iphone-se | ok | 4.8 s |
| página /termos-organizador abre certinha | iphone-15 | ok | 5.5 s |
| página /termos-organizador abre certinha | android-pixel | ok | 4.2 s |
| página /termos-organizador abre certinha | android-pequeno | ok | 4.0 s |
| página /termos-organizador abre certinha | tablet-ipad | ok | 4.9 s |
| página /app abre certinha | pc-chrome | ok | 3.3 s |
| página /app abre certinha | pc-firefox | ok | 6.2 s |
| página /app abre certinha | pc-safari | ok | 4.4 s |
| página /app abre certinha | notebook-pequeno | ok | 2.8 s |
| página /app abre certinha | iphone-se | ok | 3.6 s |
| página /app abre certinha | iphone-15 | ok | 3.9 s |
| página /app abre certinha | android-pixel | ok | 3.0 s |
| página /app abre certinha | android-pequeno | ok | 3.3 s |
| página /app abre certinha | tablet-ipad | ok | 4.2 s |
| páginas de cada evento de teste | pc-chrome | ok | 22.4 s |
| páginas de cada evento de teste | pc-firefox | ok | 30.1 s |
| páginas de cada evento de teste | pc-safari | ok | 52.6 s |
| páginas de cada evento de teste | notebook-pequeno | ok | 19.7 s |
| páginas de cada evento de teste | iphone-se | ok | 22.4 s |
| páginas de cada evento de teste | iphone-15 | ok | 32.9 s |
| páginas de cada evento de teste | android-pixel | ok | 22.9 s |
| páginas de cada evento de teste | android-pequeno | ok | 27.5 s |
| páginas de cada evento de teste | tablet-ipad | ok | 29.8 s |
| evento privado não aparece na lista nem na busca | pc-chrome | ok | 1.7 s |
| evento privado não aparece na lista nem na busca | pc-firefox | ok | 2.1 s |
| evento privado não aparece na lista nem na busca | pc-safari | ok | 2.5 s |
| evento privado não aparece na lista nem na busca | notebook-pequeno | ok | 1.5 s |
| evento privado não aparece na lista nem na busca | iphone-se | ok | 2.0 s |
| evento privado não aparece na lista nem na busca | iphone-15 | ok | 1.9 s |
| evento privado não aparece na lista nem na busca | android-pixel | ok | 1.3 s |
| evento privado não aparece na lista nem na busca | android-pequeno | ok | 1.6 s |
| evento privado não aparece na lista nem na busca | tablet-ipad | ok | 2.4 s |
| eventos de teste aparecem na lista de eventos | pc-chrome | ok | 0.9 s |
| eventos de teste aparecem na lista de eventos | pc-firefox | ok | 1.5 s |
| eventos de teste aparecem na lista de eventos | pc-safari | ok | 2.8 s |
| eventos de teste aparecem na lista de eventos | notebook-pequeno | ok | 0.7 s |
| eventos de teste aparecem na lista de eventos | iphone-se | ok | 2.3 s |
| eventos de teste aparecem na lista de eventos | iphone-15 | ok | 1.8 s |
| eventos de teste aparecem na lista de eventos | android-pixel | ok | 0.9 s |
| eventos de teste aparecem na lista de eventos | android-pequeno | ok | 1.0 s |
| eventos de teste aparecem na lista de eventos | tablet-ipad | ok | 2.0 s |
| página que não existe mostra aviso amigável (404) | pc-chrome | ok | 0.5 s |
| página que não existe mostra aviso amigável (404) | pc-firefox | ok | 1.1 s |
| página que não existe mostra aviso amigável (404) | pc-safari | ok | 1.9 s |
| página que não existe mostra aviso amigável (404) | notebook-pequeno | ok | 0.6 s |
| página que não existe mostra aviso amigável (404) | iphone-se | ok | 1.1 s |
| página que não existe mostra aviso amigável (404) | iphone-15 | ok | 1.1 s |
| página que não existe mostra aviso amigável (404) | android-pixel | ok | 0.6 s |
| página que não existe mostra aviso amigável (404) | android-pequeno | ok | 0.6 s |
| página que não existe mostra aviso amigável (404) | tablet-ipad | ok | 1.2 s |
| evento inexistente mostra aviso e não quebra | pc-chrome | ok | 0.5 s |
| evento inexistente mostra aviso e não quebra | pc-firefox | ok | 1.1 s |
| evento inexistente mostra aviso e não quebra | pc-safari | ok | 2.0 s |
| evento inexistente mostra aviso e não quebra | notebook-pequeno | ok | 0.5 s |
| evento inexistente mostra aviso e não quebra | iphone-se | ok | 0.9 s |
| evento inexistente mostra aviso e não quebra | iphone-15 | ok | 1.1 s |
| evento inexistente mostra aviso e não quebra | android-pixel | ok | 0.6 s |
| evento inexistente mostra aviso e não quebra | android-pequeno | ok | 0.7 s |
| evento inexistente mostra aviso e não quebra | tablet-ipad | ok | 1.1 s |
| Meus ingressos sem conta pede para entrar | pc-chrome | ok | 5.6 s |
| Meus ingressos sem conta pede para entrar | pc-firefox | FALHOU | 79.1 s |
| Meus ingressos sem conta pede para entrar | pc-safari | ok | 5.2 s |
| Meus ingressos sem conta pede para entrar | notebook-pequeno | ok | 5.6 s |
| Meus ingressos sem conta pede para entrar | iphone-se | ok | 1.2 s |
| Meus ingressos sem conta pede para entrar | iphone-15 | ok | 1.6 s |
| Meus ingressos sem conta pede para entrar | android-pixel | ok | 5.9 s |
| Meus ingressos sem conta pede para entrar | android-pequeno | ok | 5.6 s |
| Meus ingressos sem conta pede para entrar | tablet-ipad | ok | 1.8 s |
| páginas da conta logada | pc-chrome | ok | 7.7 s |
| páginas da conta logada | pc-firefox | ok | 10.3 s |
| páginas da conta logada | pc-safari | ok | 22.9 s |
| páginas da conta logada | notebook-pequeno | ok | 7.7 s |
| páginas da conta logada | iphone-se | ok | 10.1 s |
| páginas da conta logada | iphone-15 | ok | 10.5 s |
| páginas da conta logada | android-pixel | ok | 8.4 s |
| páginas da conta logada | android-pequeno | ok | 8.1 s |
| páginas da conta logada | tablet-ipad | ok | 11.4 s |
| menu e rodapé: todos os links internos abrem | pc-chrome | ok | 2.0 s |
| menu e rodapé: todos os links internos abrem | pc-firefox | ok | 2.6 s |
| menu e rodapé: todos os links internos abrem | pc-safari | ok | 8.3 s |
| menu e rodapé: todos os links internos abrem | notebook-pequeno | ok | 1.6 s |
| menu e rodapé: todos os links internos abrem | iphone-se | ok | 2.6 s |
| menu e rodapé: todos os links internos abrem | iphone-15 | ok | 2.9 s |
| menu e rodapé: todos os links internos abrem | android-pixel | ok | 2.0 s |
| menu e rodapé: todos os links internos abrem | android-pequeno | ok | 2.6 s |
| menu e rodapé: todos os links internos abrem | tablet-ipad | ok | 3.2 s |
| busca com textos estranhos não quebra | pc-chrome | ok | 2.6 s |
| busca com textos estranhos não quebra | pc-firefox | ok | 5.6 s |
| busca com textos estranhos não quebra | pc-safari | FALHOU | 7.9 s |
| busca com textos estranhos não quebra | notebook-pequeno | ok | 2.7 s |
| busca com textos estranhos não quebra | iphone-se | FALHOU | 4.6 s |
| busca com textos estranhos não quebra | iphone-15 | FALHOU | 4.6 s |
| busca com textos estranhos não quebra | android-pixel | ok | 2.9 s |
| busca com textos estranhos não quebra | android-pequeno | ok | 3.6 s |
| busca com textos estranhos não quebra | tablet-ipad | FALHOU | 5.9 s |
| buscar pelo campo da página inicial | pc-chrome | ok | 1.0 s |
| buscar pelo campo da página inicial | pc-firefox | ok | 2.5 s |
| buscar pelo campo da página inicial | pc-safari | ok | 3.8 s |
| buscar pelo campo da página inicial | notebook-pequeno | ok | 1.3 s |
| buscar pelo campo da página inicial | iphone-se | ok | 3.6 s |
| buscar pelo campo da página inicial | iphone-15 | ok | 3.9 s |
| buscar pelo campo da página inicial | android-pixel | ok | 1.7 s |
| buscar pelo campo da página inicial | android-pequeno | ok | 1.9 s |
| buscar pelo campo da página inicial | tablet-ipad | ok | 3.1 s |
| filtro por categoria leva para a lista filtrada | pc-chrome | ok | 4.0 s |
| filtro por categoria leva para a lista filtrada | pc-firefox | ok | 1.9 s |
| filtro por categoria leva para a lista filtrada | pc-safari | ok | 3.0 s |
| filtro por categoria leva para a lista filtrada | notebook-pequeno | ok | 1.0 s |
| filtro por categoria leva para a lista filtrada | iphone-se | ok | 3.6 s |
| filtro por categoria leva para a lista filtrada | iphone-15 | ok | 3.8 s |
| filtro por categoria leva para a lista filtrada | android-pixel | ok | 1.7 s |
| filtro por categoria leva para a lista filtrada | android-pequeno | ok | 1.9 s |
| filtro por categoria leva para a lista filtrada | tablet-ipad | ok | 4.0 s |
