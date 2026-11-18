# Como cadastrar e gerenciar os imóveis

O site tem duas frentes:

- **Site público** (`index.html` e demais páginas): o que os clientes veem.
- **Painel do corretor** (`admin.html`): onde você publica, altera, desativa e exclui imóveis.

Endereço do painel, depois de publicado: `https://kaiofs.com.br/admin.html` (salve nos favoritos). Ele não aparece no menu do site nem no Google.

## Primeiro acesso (uma vez só)

1. Crie uma chave de acesso no GitHub: https://github.com/settings/personal-access-tokens/new
   - **Token name:** Painel do site
   - **Expiration:** a validade que preferir. Quando vencer, é só criar outra.
   - **Repository access:** *Only select repositories* e escolha o repositório do site
   - **Permissions → Repository permissions → Contents:** *Read and write*
   - Clique em **Generate token** e copie a chave (`github_pat_...`).
2. Abra o painel e preencha seu usuário do GitHub, o nome do repositório e a chave.
3. Deixe marcado **Manter conectado neste aparelho** se o computador ou celular for só seu.

A chave só funciona no repositório do site e fica guardada apenas no seu aparelho. Nunca envie a chave para ninguém.

## No dia a dia

- **Abas:** À venda, Aluguel e Comercial.
- **Novo imóvel:** preencha o formulário, adicione as fotos e clique em **Salvar e publicar**.
- **Editar:** muda qualquer informação, inclusive as fotos. Dá para reordenar as fotos, escolher a capa e remover.
- **Desativar / Ativar:** tira o imóvel do site sem apagar (use quando vender ou alugar). Para voltar, clique em Ativar.
- **Excluir:** apaga o imóvel do cadastro. Prefira desativar, se puder precisar dele de novo.
- **Ver:** abre a página do imóvel no site.

Depois de salvar, o site público se atualiza em cerca de 1 minuto.

## Dicas

- **Fotos:** até 4 por imóvel. São reduzidas automaticamente para carregar rápido. Prefira fotos horizontais.
- **Vídeo:** 1 por imóvel. Pode ser um link do YouTube (recomendado: publique como "Não listado") ou um arquivo MP4/MOV de até 25 MB. Aparece na galeria do imóvel, ao lado das fotos.
- **Código do imóvel:** cada imóvel novo ganha um código automático (KV-001 à venda, KA-001 aluguel, KC-001 comercial). Ele aparece no site, nas mensagens do WhatsApp e pode ser usado na busca do painel.
- **Situação do negócio:** ao vender ou alugar, mude para "Vendido" ou "Alugado". O imóvel continua no site com o selo, no fim da lista, como prova de negócio fechado. O botão vira "Quero um parecido". Quando quiser tirar de vez, use Desativar.
- **Desativar:** o imóvel some na hora da lista, da página inicial (destaques) e da página dele no site (depois da atualização de cerca de 1 minuto).
- **Cidade e Estado (UF):** preencha sempre. Eles alimentam os filtros das páginas Comprar e Comercial.
- **Destacar na página inicial:** coloca o imóvel na Home (até 6 imóveis).
- **Exemplos:** apague os imóveis "Exemplo" depois de cadastrar os seus.

## Onde ficam os dados

- `data/venda.json`: imóveis à venda (página Comprar)
- `data/aluguel.json`: imóveis para alugar (página Alugar)
- `data/comercial.json`: galpões, salas e lojas (página Comercial)
- `imagens/imoveis/`: fotos

O arquivo `.pages.yml` mantém o Pages CMS (app.pagescms.org) como alternativa, caso queira editar por lá.
