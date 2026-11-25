import { useState } from 'react'
import { Link } from 'react-router-dom'
import SignUpValidation from './SignUpValidation'
import axios from 'axios'

const SignUp = () => {
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  const handleInput = (event) => {
    setValues({ ...values, [event.target.name]: event.target.value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrors(SignUpValidation(values));
    if(errors.name == "" && errors.email == "" && errors.password == ""){
       axios.post('http://localhost:3001/signup',values)
    }
     
    
  };

  return (
     <div >
        <h1>Sign Up</h1>
        <div >
            <form onSubmit={handleSubmit}>
                <div className='mb-3'>
                    <label htmlFor='name'>Name</label>
                    <input
                      id='name'
                      name='name'
                      type='text'
                      placeholder='Enter your Name'
                      value={values.name}
                      onChange={handleInput}
                    />
                    {errors.name && <div className='text-danger'>{errors.name}</div>}
                </div>
                <div className='mb-3'>
                    <label htmlFor='email'>Email</label>
                    <input
                      id='email'
                      name='email'
                      type='email'
                      placeholder='Enter your email'
                      value={values.email}
                      onChange={handleInput}
                    />
                    {errors.email && <div className='text-danger'>{errors.email}</div>}
                </div>
                 <div className='mb-3'>
                    <label htmlFor='password'>Password</label>
                    <input
                      id='password'
                      name='password'
                      type='password'
                      placeholder='Enter your password'
                      value={values.password}
                      onChange={handleInput}
                    />
                    {errors.password && <div className='text-danger'>{errors.password}</div>}
                </div>
                <button type='submit' className='btn btn-success' >Sign Up</button>
                <p>
                    You are agree our terms and policies
                </p>
                <Link to='/login' className='btn btn-default-border text-decoration-none'> Login</Link>
            </form>
        </div>
    </div>
  )
}

export default SignUp