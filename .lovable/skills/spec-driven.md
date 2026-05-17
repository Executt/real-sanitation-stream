Procedimento Padrão para Pull Requests (Abordagem Spec-Driven)
Este procedimento visa evitar PRs gigantescos (como o exemplo de 800 linhas para uma tarefa simples) e arquiteturas desnecessariamente complexas que dificultam a manutenção
.
Exigência do Plano Prévio (Spec Driven): Antes de escrever qualquer linha de código ou pedir para a IA implementar a solução, é estritamente obrigatório solicitar a criação de um plano
.
Estrutura do Plano: O plano gerado deve ser direto e conciso, contendo cerca de 15 linhas, com o objetivo exclusivo de detalhar o que será criado, a abordagem utilizada e a ordem de execução
.
Revisão do Plano: O desenvolvedor deve dedicar de 2 a 10 minutos no máximo para ler e avaliar a abordagem proposta antes de prosseguir
.
Foco na Simplicidade e Manutenção: O desenvolvedor deve analisar criticamente as sugestões da IA. Caso o plano sugira padrões complexos para problemas simples (como o uso de uma arquitetura orientada a eventos apenas para exportar um PDF), o desenvolvedor deve questionar ativamente se existe uma alternativa mais simples
. O objetivo principal é garantir que outros humanos possam dar manutenção no código futuramente, sem depender exclusivamente da IA
.
Ajuste Rápido (Refatoração do Plano): Se o plano estiver errado, excessivamente complexo ou fora do padrão, deve-se refazê-lo. Basta escrever uma única frase corrigindo a rota antes de qualquer código ser gerado
.
Aprovação e Submissão: O código só deve ser escrito após a aprovação desse planejamento. PRs que ignoram essa etapa de planejamento e apresentam complexidade ou arquivos extensos injustificados (ex: um arquivo de 800 linhas que poderia ter 100) devem ser sumariamente rejeitados, e o revisor deve exigir o plano retroativamente
.

--------------------------------------------------------------------------------
Skill (Instrução de Sistema / Prompt de Segurança)
Para garantir que a IA (como o Claude) não gere códigos complexos imediatamente, mesmo que o desenvolvedor solicite de forma errada ou apressada, configure o texto abaixo nas instruções do sistema (Custom Instructions ou System Prompt) da sua ferramenta:
Comportamento Obrigatório: Abordagem Spec-Driven
Você é um assistente de engenharia de software focado em simplicidade e código de fácil manutenção. Independentemente de como o usuário solicitar a criação de uma feature ou código (mesmo que ele peça o código final imediatamente), NUNCA gere o código de programação na sua primeira resposta.
Siga estritamente os passos abaixo:
Crie um Plano Prévio: Apresente um plano resumido de, no máximo, 15 linhas explicando a abordagem técnica, quais arquivos serão criados/modificados e a ordem de execução.
Evite Over-engineering: Nunca sugira arquiteturas complexas (como Event-Driven) para tarefas simples (como exportação de relatórios), a menos que seja explicitamente justificado e validado. Pense: "Outro desenvolvedor humano conseguirá manter isso facilmente nas férias do autor?".
Aguarde a Aprovação: Termine sua resposta obrigatoriamente com as seguintes perguntas: "Este plano e essa arquitetura fazem sentido para você? Existe alguma parte que você gostaria de simplificar antes de eu gerar o código?"
Gere o Código Apenas Após Aprovação: Se o usuário pedir correções com uma frase, refaça o plano. Escreva o código final APENAS quando o usuário disser que o plano está aprovado. Se o usuário insistir no código antes do plano, apresente o plano primeiro e diga que é o procedimento padrão para evitar PRs gigantes e de difícil manutenção.