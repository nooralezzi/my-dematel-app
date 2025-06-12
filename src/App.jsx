// Full App with DEMATEL logic, intermediate matrices, and final UI
import React, { useState } from "react";
import Button from "./Button";
import { Card, CardContent } from "./Card";
import Input from "./Input";
import * as XLSX from "xlsx";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
//import * as math from "mathjs"
//const baseUrl = import.meta.env.VITE_API_URL 

import { create, all } from 'mathjs';

const math = create(all, {
  number: 'BigNumber',
  precision: 32,
});

const roundMatrix = (matrix, decimales = 3) => 
  matrix.map(row => row.map(val => +val.toFixed(decimales)))
const linguisticMap = {
  ALI: { a: [0.0, 0.0, 0.0, 0.0], b: [0.0, 0.0, 0.0, 0.0] },
  LI:  { a: [0.0, 0.1, 0.2, 0.3], b: [0.0, 0.1, 0.2, 0.3] },
  FLI: { a: [0.1, 0.2, 0.3, 0.4], b: [0.0, 0.2, 0.3, 0.5] },
  MI:  { a: [0.3, 0.4, 0.5, 0.6], b: [0.2, 0.4, 0.5, 0.7] },
  FHI: { a: [0.5, 0.6, 0.7, 0.8], b: [0.4, 0.6, 0.7, 0.9] },
  HI:  { a: [0.7, 0.8, 0.9, 1.0], b: [0.7, 0.8, 0.9, 1.0] },
  AHI: { a: [1.0, 1.0, 1.0, 1.0], b: [1.0, 1.0, 1.0, 1.0] },
};

const computeExpectedValue = ({ a, b }) => {
  const sum = [...a, ...b].reduce((acc, val) => acc + val, 0);
  return sum / 8;
};
console.log("✅ Verifying Expected Crisp Values:");
Object.entries(linguisticMap).forEach(([term, value]) => {
  const ev = computeExpectedValue(value).toFixed(2);
  console.log(`${term}: ${ev}`);
});


export default function App() {
  const [criteria, setCriteria] = useState([""]);
  const [alternatives, setAlternatives] = useState([""]);
  const [weights, setWeights] = useState([""]);
  const [matrix, setMatrix] = useState([[""]]);
  const [error, setError] = useState("");
  const [output, setOutput] = useState(null);

  const handleAddCriteria = () => {
    setCriteria([...criteria, ""]);
    setWeights([...weights, ""]);
    setMatrix(matrix.map(row => [...row, ""]));
  };

  const handleAddAlternative = () => {
    setAlternatives([...alternatives, ""]);
    setMatrix([...matrix, new Array(criteria.length).fill("")]);
  };

  const handleChange = (setter, index, value) => {
    const updated = [...setter];
    updated[index] = value;
    return updated;
  };

  const handleMatrixChange = (i, j, value) => {
    const updated = [...matrix];
    updated[i][j] = value.toUpperCase();
    setMatrix(updated);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (rows.length < 2) return setError("Excel file must include headers and data rows");

      const [header, ...dataRows] = rows;
      const parsedCriteria = header.slice(1);
      const parsedAlternatives = dataRows.map(row => row[0]);
      const parsedMatrix = dataRows.map(row => row.slice(1).map(cell => String(cell).toUpperCase()));

      setCriteria(parsedCriteria);
      setAlternatives(parsedAlternatives);
      setMatrix(parsedMatrix);
      setWeights(new Array(parsedCriteria.length).fill(""));
      setError("");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = () => {
    if (!criteria.length || !alternatives.length || !weights.every(w => w)) {
      setError("Please fill out all weights, criteria, and alternatives");
      return;
    }

    const crispMatrix = matrix.map(row =>
      row.map(value => {
        const mapped = linguisticMap[value];
        return mapped ? math.bignumber(computeExpectedValue(mapped)) : math.bignumber(NaN);
      })
    );
    console.log("crisp matrix:",crispMatrix)
    //const roundedCrispMatrix =  roundMatrix(crispMatrix)


    //original 
    // const rowSums = crispMatrix.map(row => row.reduce((sum, val) => sum + val, 0));
    // const maxSum = Math.max(...rowSums);
    // const normalizedMatrix = crispMatrix.map(row => row.map(val => val / maxSum));

    const rowSums = crispMatrix.map(row => math.sum(row));
    const maxSum = rowSums.reduce((a, b) => math.max(a, b), math.bignumber(0));
    const k = math.divide(1, maxSum);
    const normalizedMatrix = crispMatrix.map(row => row.map(val => math.multiply(val, k))
    );


    const size = normalizedMatrix.length;
    const I = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => (i === j ? 1 : 0)));
    const subtractMatrix = (A, B) => A.map((row, i) => row.map((val, j) => val - B[i][j]));
    const multiplyMatrices = (A, B) => A.map((row, i) => B[0].map((_, j) => row.reduce((sum, val, k) => sum + val * B[k][j], 0)));

    // const det = math.det(IminusX);
    // if (Math.abs(det) < 1e-6){
    //   setError("Matrix is singular or nearly singular , Adjust Input")
    // }
    console.log("normalized matrix:", normalizedMatrix)
    const invertMatrix = (M) => {
      try {
        return math.inv(M);
      }
      catch (e){
        console.error("matrix enversion failed", e.message)
        return null;
      }
    };

    let totalRelationMatrix;
    try {
      const IminusX = subtractMatrix(I, normalizedMatrix);
      const inverseIminusX = invertMatrix(IminusX);
      totalRelationMatrix =roundMatrix(multiplyMatrices(normalizedMatrix, inverseIminusX));
    } catch (e) {
      setError("Matrix inversion failed. Check for linear dependencies.");
      return;
    }

     // original
    // const D = totalRelationMatrix.map(row => row.reduce((a, b) => a + b, 0));
    //const R = totalRelationMatrix[0].map((_, j) => totalRelationMatrix.reduce((sum, row) => sum + row[j], 0));

    const D = totalRelationMatrix.map(row =>row.reduce((sum, val) => math.add(sum, val), math.bignumber(0)).toNumber());

    const R = totalRelationMatrix[0].map((_, j) =>
      totalRelationMatrix.reduce((sum, row) => math.add(sum, row[j]), math.bignumber(0)).toNumber()
    );
    

    const prominence = D.map((d, i) => +(d + R[i]).toFixed(2));
    const relation = D.map((d, i) => +(d - R[i]).toFixed(2));

    const ranking = prominence.map((p, i) => ({
      alternative: alternatives[i] || `Alt ${i + 1}`,
      prominence: p,
      relation: relation[i],
      type: relation[i] >= 0 ? "Cause" : "Effect",
    })).sort((a, b) => b.prominence - a.prominence);

    setOutput({ crispMatrix, normalizedMatrix, totalRelationMatrix, prominence, relation, ranking });
    setError("");
  };






  // const handleSubmit = () => {
  //   if (!criteria.length || !alternatives.length || !weights.every(w => w)) {
  //     setError("Please fill out all weights, criteria, and alternatives");
  //     return;
  //   }
  
  //   // Convert linguistic terms to expected crisp values
  //   const crispMatrix = matrix.map(row =>
  //     row.map(value => {
  //       const mapped = linguisticMap[value];
  //       return mapped ? computeExpectedValue(mapped) : NaN;
  //     })
  //   );
  
  //   console.log("Sending matrix to backend:", crispMatrix);
  
  //   // Check for invalid values
  //   if (crispMatrix.some(row => row.some(val => isNaN(val)))) {
  //     setError("Invalid linguistic values found in matrix.");
  //     return;
  //   }
  
  //   // Send data to FastAPI backend
  //   fetch(`${baseUrl}/dematel`, {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json"
  //     },
  //     body: JSON.stringify({
  //       matrix: crispMatrix,
  //       criteria: criteria
  //     })
  //   })
  //     .then(res => {
  //       if (!res.ok) throw new Error("Backend returned an error.");
  //       return res.json();
  //     })
  //     .then(data => {
  //       console.log("✅ FastAPI Response:", data);
  //       setOutput({
  //         crispMatrix,
  //         normalizedMatrix: [], // Optional: you can compute and set it if needed
  //         totalRelationMatrix: data.total_relation_matrix,
  //         prominence: data.prominence,
  //         relation: data.relation,
  //         ranking: data.ranking
  //       });
  //       setError("");
  //     })
  //     .catch(err => {
  //       console.error("❌ Error communicating with backend:", err);
  //       setError("Error contacting backend: " + err.message);
  //     });
  // };
  
  return (
    <div className="p-6 space-y-6">
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md">
        <p className="text-sm">
          You can either <strong>enter data manually</strong> using the forms below, or <strong>upload an Excel file</strong>.
        </p>
      </div>

      {error && <p className="text-red-500 font-semibold">{error}</p>}

      <Card><CardContent className="space-y-4">
        <h2 className="text-xl font-semibold">Upload Excel File</h2>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
      </CardContent></Card>

      <Card><CardContent className="space-y-4">
        <h2 className="text-xl font-semibold">Criteria</h2>
        {criteria.map((c, i) => (
          <Input key={i} value={c} onChange={(e) => setCriteria(handleChange(criteria, i, e.target.value))} placeholder={`Criterion ${i + 1}`} />
        ))}
        <Button onClick={handleAddCriteria}>Add Criterion</Button>
      </CardContent></Card>

      <Card><CardContent className="space-y-4">
        <h2 className="text-xl font-semibold">Alternatives</h2>
        {alternatives.map((a, i) => (
          <Input key={i} value={a} onChange={(e) => setAlternatives(handleChange(alternatives, i, e.target.value))} placeholder={`Alternative ${i + 1}`} />
        ))}
        <Button onClick={handleAddAlternative}>Add Alternative</Button>
      </CardContent></Card>

      <Card><CardContent className="space-y-4">
        <h2 className="text-xl font-semibold">Weights</h2>
        {criteria.map((_, i) => (
          <Input key={i} type="number" value={weights[i]} onChange={(e) => setWeights(handleChange(weights, i, e.target.value))} placeholder={`Weight for Criterion ${i + 1}`} />
        ))}
      </CardContent></Card>

      <Card><CardContent className="space-y-4">
        <h2 className="text-xl font-semibold">Performance Matrix (Linguistic Terms)</h2>
        {alternatives.map((_, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            {criteria.map((_, j) => (
              <Input key={j} value={matrix[i]?.[j] || ""} onChange={(e) => handleMatrixChange(i, j, e.target.value)} placeholder={`Alt ${i + 1} - Crit ${j + 1}`} />
            ))}
          </div>
        ))}
      </CardContent></Card>

      <Button className="bg-blue-500 hover:bg-blue-600" onClick={handleSubmit}>Submit</Button>

      {output && (
        <Card><CardContent className="space-y-6">
          <h2 className="text-xl font-bold">📊 Results</h2>

          <div>
            <h3 className="text-lg font-semibold">🏁 Final Ranking</h3>
            <table className="w-full text-left border border-gray-300">
              <thead><tr className="bg-gray-100">
                <th className="border px-2">Alternative</th>
                <th className="border px-2">Prominence</th>
                <th className="border px-2">Relation</th>
                <th className="border px-2">Type</th>
              </tr></thead>
              <tbody>
                {output.ranking.map((item, i) => (
                  <tr key={i}>
                    <td className="border px-2">{item.alternative}</td>
                    <td className="border px-2">{item.prominence}</td>
                    <td className="border px-2">{item.relation}</td>
                    <td className="border px-2">{item.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-lg font-semibold">📉 Crisp Matrix</h3>
            <pre className="text-sm bg-gray-50 p-2 rounded border">{JSON.stringify(output.crispMatrix, null, 2)}</pre>
          </div>
          <div>
            <h3 className="text-lg font-semibold">🔄 Normalized Matrix</h3>
            <pre className="text-sm bg-gray-50 p-2 rounded border">{JSON.stringify(output.normalizedMatrix, null, 2)}</pre>
          </div>
          <div>
            <h3 className="text-lg font-semibold">🧮 Total Relation Matrix</h3>
            <pre className="text-sm bg-gray-50 p-2 rounded border">{JSON.stringify(output.totalRelationMatrix, null, 2)}</pre>
          </div>

          <div>
            <h3 className="text-lg font-semibold">📍 Cause–Effect Diagram</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="prominence" name="Prominence" />
                <YAxis type="number" dataKey="relation" name="Relation" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter
                  name="Alternatives"
                  data={output.ranking.map((r, i) => ({
                    prominence: parseFloat(r.prominence),
                    relation: parseFloat(r.relation),
                    alt: r.alternative
                  }))}
                  fill="#8884d8"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

        </CardContent></Card>
      )}
    </div>
  );
}
