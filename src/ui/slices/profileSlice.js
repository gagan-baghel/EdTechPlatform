import {createSlice} from "@reduxjs/toolkit"

const getStoredUser = () => {
    if (typeof window === "undefined") return null

    const user = localStorage.getItem("user")
    return user ? JSON.parse(user) : null
}

const initialState = {
    user: getStoredUser(),
    loading: false,
};

const profileSlice = createSlice({
    name:"profile",
    initialState: initialState,
    reducers: {
        setUser(state, value) {
            state.user = value.payload;
        },
        setLoading(state, value) {
            state.loading = value.payload;
        },
    },
});

export const {setUser, setLoading} = profileSlice.actions;
export default profileSlice.reducer;
