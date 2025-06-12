export default function Input ({textarea, label,ref, ...props}){
  const classes="w-full p-1 border-b-2 rounded-sm border-stone-200 focus:outline-none focus:border-stone-400"
  return <>
  <p className="flex flex-col  gep-1 my-4">
   <label className={classes} >{label}</label> 
  {textarea ? <textarea ref={ref} className={classes} {...props}/> : <input ref={ref} className={classes} {...props} />}
  </p>
    </>
}