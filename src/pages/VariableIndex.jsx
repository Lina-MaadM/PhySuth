import { physicsTopics } from "../data/physicsData";
import VariableCard from "../components/VariableCard";

function VariableIndex() {
  return (
    <div className="p-6 pt-24 space-y-12 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Variable Index</h1>

      {physicsTopics.map((topicBlock) => {
        const { topic, datasets } = topicBlock;

        const variableMap = new Map();

        datasets.forEach((dataset) => {
          if (!Array.isArray(dataset?.variable_sub)) return;

          dataset.variable_sub.forEach((v) => {
            if (!variableMap.has(v.symbol)) {
              variableMap.set(v.symbol, v);
            }
          });
        });

        const uniqueVariables = Array.from(variableMap.values())
          .sort((a, b) => a.symbol.localeCompare(b.symbol));

        if (uniqueVariables.length === 0) return null;

        return (
          <section key={topic} className="space-y-4">
            <h2 className="text-xl font-semibold">{topic}</h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {uniqueVariables.map((v) => (
                <VariableCard
                  key={v.symbol}
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