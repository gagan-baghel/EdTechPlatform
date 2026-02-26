import { useSelector } from 'react-redux'
import { Navigate } from '@/ui/lib/router';

const PrivateRoute = ({children}) => {

    const {token} = useSelector((state) => state.auth);

    if(token !== null) {
        return children
    }

    return <Navigate to="/login" />

}

export default PrivateRoute
