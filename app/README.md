# Aplicação piloto

Esta pasta contém o piloto navegável do Sistema PARTIDA.

## Funcionalidades

- página de boas-vindas;
- criação de conta e entrada local;
- modo demonstração;
- diagnóstico de cinco dimensões de fricção;
- recomendação transparente;
- sessão cronometrada de partida;
- jornada prática de 30 dias;
- revisão semanal e exportação de dados;
- biblioteca com eBook e podcast.

## Executar localmente

Sirva a pasta `app/` com qualquer servidor estático. Exemplo:

```bash
python -m http.server 8080 --directory app
```

Abra `http://localhost:8080`.

## Dados e autenticação

Nesta fase de validação, contas e registros ficam no `localStorage` do navegador. As senhas são transformadas antes do armazenamento, mas esta implementação não deve ser usada como autenticação de produção. A etapa seguinte é substituir o adaptador local por autenticação e banco de dados centralizados.

## eBook

O arquivo integral do eBook não fica versionado no repositório público. Para habilitar o download em uma implantação própria, adicione o PDF licenciado em:

`app/assets/PARTIDA_Sistema_Antiprocrastinacao_Ian_Salvero.pdf`

A versão publicada pelo autor já inclui esse arquivo.
