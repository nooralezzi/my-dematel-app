export default function Button ({children,...props}){
  return <button className="mt-5 bg-stone-800 px-5 py-1 rounded-md text-stone-100 hover:bg-stone-950" {...props}>
{children}
  </button>
}