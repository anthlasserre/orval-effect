import { Schema as S } from 'effect';
import './App.css';

import { Pet } from './gen/models';
import { useListPets, useCreatePets } from './gen/endpoints/pets/pets';
import { CreatePetsBodyItem } from './gen/endpoints/pets/pets.effect';

function App() {
  const { data } = useListPets();
  const { trigger } = useCreatePets();

  const createPet = async () => {
    // The schema fails on a pet name that is not a string.
    const pet = { name: 123, tag: 'test' };

    try {
      const parsedPet = S.decodeUnknownSync(CreatePetsBodyItem)(pet);

      await trigger([parsedPet]);
    } catch (error) {
      console.log('raise error', error);
    }
  };

  return (
    <>
      <h1>pet list</h1>
      <div>
        {data?.data &&
          data.data.map((pet: Pet, index: number) => (
            <ul key={index}>
              <li>id: {pet.id}</li>
              <li>name: {pet.name}</li>
              <li>tag: {pet.tag}</li>
            </ul>
          ))}
        <button onClick={createPet}>Create Pet</button>
      </div>
    </>
  );
}

export default App;
