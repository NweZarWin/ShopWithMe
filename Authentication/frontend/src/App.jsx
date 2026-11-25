import React from 'react'
import Login from './login'
import SignUp from './SignUp'
import {BrowserRouter,Routes,Route} from 'react-router-dom'
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/login' element={<Login/>}></Route>
        <Route path='/signup' element={<SignUp/>}></Route>

      </Routes>
    
    </BrowserRouter>
  )
}

export default App