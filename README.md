# LIFTY

Aplicativo pessoal de acompanhamento de treinos, frequência, cardio e evolução corporal.

## Principais recursos

- Treinos-base com criação, edição, duplicação e exclusão.
- Alterações de exercícios apenas na sessão do dia sem modificar o treino-base.
- Sugestão automática dos dados da última execução do exercício.
- Frequência de treinos com calendário, múltiplos treinos por dia e gráfico mensal.
- Perfil com nome, altura, sexo, idade e foto.
- Metas corporais, de frequência e de cardio por semana, mês ou ano.
- Dashboard com acompanhamento de metas e progresso de distância/tempo de cardio.
- Evolução de peso e gordura corporal com fotos e linha de referência da meta.
- Backup e restauração completos em JSON, incluindo fotos.
- Dados armazenados localmente em IndexedDB.
- PWA instalável e funcionamento offline.
- Identidade visual LIFTY em verde-limão e preto, com abertura animada.

## Desenvolvimento local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

O workflow `.github/workflows/deploy-pages.yml` compila e publica o app automaticamente a cada push na branch `main`.

No GitHub, configure `Settings > Pages > Build and deployment > Source` como `GitHub Actions`.


## LIFTY v0.3

Inclui Treinos Intervalados (Tabata, EMOM, AMRAP e Personalizado), Treinos Prontos, biblioteca ampliada de exercícios, modo de edição/cancelamento de sessão, integração da frequência e Dashboard, metas de cardio por atividade e backup v3.

## LIFTY v0.4 — Treinos híbridos
- Ambiente único de Meus Treinos com subblocos Resistido, Cardio e Intervalado.
- Reordenação de subblocos e exercícios por arrastar/soltar e botões de subir/descer.
- Cargas somente durante a execução em Treinar.
- Intervalados configurados por subbloco, com tempos individuais por exercício e descanso entre ciclos.
- Feedback sonoro do timer com opção de ativar/desativar.
- Importação/exportação de treino individual em JSON (formatVersion 4).
- Histórico detalhado por subbloco na Frequência de Treinos.
- Evolução corporal com pescoço, cintura/abdômen, quadril e estimativa U.S. Navy editável.
- Migração do banco Dexie v3 para v4 preservando treinos, sessões e Treinos Prontos legados.
