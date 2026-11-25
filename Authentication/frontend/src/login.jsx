import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { LoginValidation } from './LoginValidation'

 const Login = () => {
    const [values,setValues] = useState({
        email:'',
        password:''
    })
    const [errors, setErrors] = useState({})
    const handleSubmit = (event) => {
        event.preventDefault();
      
        setErrors(LoginValidation(values))
    }
    const handleInput = (event) => {
        setValues(prev => ({ ...prev, [event.target.name]: event.target.value }));
       
    }
  return (
    <div >
        <h1>Sign In</h1>
        <div >
            <form action='' onSubmit={handleSubmit}>
                <div className='mb-3'>
                    <label htmlFor='email'>Email</label>
                    <input
                        type='email'
                        placeholder='Enter your email'
                        name='email'
                        value={values.email}
                        onChange={handleInput}
                    />
                    {errors.email && <div className='text-danger'>{errors.email}</div>}
                </div>
                 <div className='mb-3'>
                    <label htmlFor='password'>Password</label>
                    <input
                        type='password'
                        placeholder='Enter your password'
                        name='password'
                        value={values.password}
                        onChange={handleInput}
                    />
                    {errors.password && <div className='text-danger'>{errors.password}</div>}
                </div>
                <button type='submit' className='btn btn-success' >log in</button>
                <p>
                    You are agree our terms and policies
                </p>
                <Link to='/signup' className='btn btn-default-border text-decoration-none'>Create Account</Link>
            </form>
        </div>
    </div>
  )
}

export default Login