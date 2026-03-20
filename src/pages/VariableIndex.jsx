import { physicsTopics, variableIndex } from "../data/physicsData";
import VariableCard from "../components/VariableCard";

function VariableIndex() {

  return (
    <div className="p-6 pt-24 space-y-12 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Variable Index</h1>

      {physicsTopics.map((topicBlock) => {
        const { topic } = topicBlock;

        // ดึง variable จาก global index
        const variables = Object.values(variableIndex)
          .filter((v) => v.topic === topic)
          .sort((a, b) => a.key.localeCompare(b.key));

        if (variables.length === 0) return null;

        return (
          <section key={topic} className="space-y-4">
            <h2 className="text-xl font-semibold">{topic}</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {variables.map((v) => (
                <VariableCard
                  key={v.key}
                  varKey={v.key}
                  symbol={v.symbol}
                  name={v.name}
                  unit={v.unit}
                  description={v.description}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default VariableIndex;