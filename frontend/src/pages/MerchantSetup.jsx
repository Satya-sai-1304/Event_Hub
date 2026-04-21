import { useState } from "react" 
import { useSearchParams, useNavigate } from "react-router-dom" 
import axios from "axios" 

export default function MerchantSetup() { 

 const [searchParams] = useSearchParams() 
 const token = searchParams.get("token") 

 const [password,setPassword] = useState("") 
 const [confirmPassword,setConfirmPassword] = useState("") 

 const navigate = useNavigate() 

 const handleSubmit = async(e)=>{ 
  e.preventDefault() 

  if(password !== confirmPassword){ 
   alert("Passwords do not match") 
   return 
  } 

  try{ 

   await axios.post("http://localhost:5000/api/merchants/setup",{ 
    token, 
    password 
   }) 

   alert("Account activated successfully") 
   navigate("/login") 

  }catch(err){ 
   alert("Invalid or expired link") 
  } 

 } 

 return ( 

  <div style={{padding:"40px", maxWidth: "400px", margin: "0 auto"}}> 
   <h2>Activate Merchant Account</h2> 

   <form onSubmit={handleSubmit}> 

    <input 
     type="password" 
     placeholder="Set Password" 
     value={password} 
     onChange={(e)=>setPassword(e.target.value)} 
     style={{width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "4px", border: "1px solid #ccc"}}
    /> 

    <br/> 

    <input 
     type="password" 
     placeholder="Confirm Password" 
     value={confirmPassword} 
     onChange={(e)=>setConfirmPassword(e.target.value)} 
     style={{width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "4px", border: "1px solid #ccc"}}
    /> 

    <br/> 

    <button type="submit" style={{width: "100%", padding: "12px", backgroundColor: "#4f46e5", color: "white", border: "none", borderRadius: "4px", cursor: "pointer"}}> 
     Activate Account 
    </button> 

   </form> 

  </div> 

 ) 

 } 
